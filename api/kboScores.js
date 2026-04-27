export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const pad = n => String(n).padStart(2, '0');
  const query = req.query || {};
  const requestedDate = String(query.date || '').trim();
  const isRequestedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayDash = isRequestedDate
    ? requestedDate
    : `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
  const todayStr = todayDash.replace(/-/g, '');

  const TEAM_CODE = {
    HT: 'KIA',
    KT: 'KT',
    LG: 'LG',
    SK: 'SSG',
    NC: 'NC',
    OB: '두산',
    LT: '롯데',
    SS: '삼성',
    HH: '한화',
    WO: '키움',
  };

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 NaverSportsApp',
    Referer: 'https://m.sports.naver.com/game/center',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    Origin: 'https://m.sports.naver.com',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'x-requested-with': 'XMLHttpRequest',
  };

  const mapTeam = (code, fallback = '') => TEAM_CODE[code] || fallback || code || '';
  const isKiaTeam = name => name === 'KIA';
  const safeNumber = value => {
    if (value === null || value === undefined || value === '' || value === '-') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJson(url, timeoutMs = 8000) {
    const response = await fetchWithTimeout(url, { headers: HEADERS }, timeoutMs);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  function detectStatus(game) {
    const sc = String(game?.statusCode || '').toUpperCase();
    const si = String(game?.statusInfo || '').toUpperCase();
    const canceled = /CANCEL|PPD|RAIN|POSTPONE|SUSPEND/.test(sc) || /취소|우천|연기|CANCEL|PPD/.test(si);
    if (canceled) return 'CANCELED';
    if (sc === 'STARTED' || sc === 'LIVE') return 'LIVE';
    if (sc === 'RESULT' || sc === 'FINAL') return 'FINAL';
    return 'SCHEDULED';
  }

  function inningInfoText(game, currentGameState) {
    return game?.statusInfo || currentGameState?.inningDisplay || currentGameState?.inningText || null;
  }

  function normalizeCurrentGameState(raw, playerMap = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const resolveName = (nameField, idField) => {
      if (nameField && !/^\d+$/.test(String(nameField))) return String(nameField);
      if (idField !== undefined && idField !== null) return playerMap[String(idField)] || '';
      return '';
    };

    return {
      ...raw,
      ball: raw.ball ?? raw.ballCount ?? raw.balls ?? 0,
      strike: raw.strike ?? raw.strikeCount ?? raw.strikes ?? 0,
      out: raw.out ?? raw.outCount ?? raw.outs ?? 0,
      base1: raw.base1 ?? raw.runner1 ?? 0,
      base2: raw.base2 ?? raw.runner2 ?? 0,
      base3: raw.base3 ?? raw.runner3 ?? 0,
      pitcherName: resolveName(raw.pitcherName || raw.currentPitcherName, raw.pitcher || raw.pitcherId),
      batterName: resolveName(raw.batterName || raw.currentBatterName, raw.batter || raw.batterId),
    };
  }

  function findTextRelaysRecursive(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      return obj.length && (obj[0].title || obj[0].text || obj[0].type || obj[0].textOptions) ? obj : null;
    }
    if (Array.isArray(obj.textRelays)) return obj.textRelays;
    if (Array.isArray(obj.relays)) return obj.relays;
    if (Array.isArray(obj.list)) return obj.list;
    for (const key of Object.keys(obj)) {
      const found = findTextRelaysRecursive(obj[key]);
      if (found) return found;
    }
    return null;
  }

  function extractResult(item) {
    const opts = Array.isArray(item?.textOptions) ? item.textOptions : [];
    if (!opts.length) return null;
    const last = opts[opts.length - 1];
    return last?.text || last?.title || null;
  }

  function extractLineupPair(raw) {
    if (!raw) return { home: null, away: null };
    const td = raw.textRelayData || raw;
    const gd = raw.game || {};
    const lu = raw.lineUpData || gd.lineUpData || {};
    return {
      home: td.homeLineup || td.homeTeamLineup || raw.homeLineup || raw.homeTeamLineup || gd.homeLineup || gd.homeTeamLineup || lu.homeLineup || lu.homeTeamLineup || null,
      away: td.awayLineup || td.awayTeamLineup || raw.awayLineup || raw.awayTeamLineup || gd.awayLineup || gd.awayTeamLineup || lu.awayLineup || lu.awayTeamLineup || null,
    };
  }

  function parseBatters(arr) {
    return (Array.isArray(arr) ? arr : []).map(player => ({
      batOrder: player.batOrder || player.orderNum || player.order || 0,
      name: player.name || player.playerName || '',
      posName: player.posName || player.position || player.pos || '',
      pcode: player.pcode || '',
      ab: Number(player.ab ?? player.atBat ?? 0),
      hit: Number(player.hit ?? player.hits ?? 0),
      rbi: Number(player.rbi ?? player.rbis ?? 0),
      run: Number(player.run ?? player.runs ?? 0),
      bb: Number(player.bb ?? player.walk ?? player.walks ?? player.baseOnBalls ?? 0),
    }));
  }

  function parsePitchers(arr) {
    return (Array.isArray(arr) ? arr : []).map(player => ({
      seqno: player.seqno || player.orderNum || 0,
      name: player.name || player.playerName || '',
      pcode: player.pcode || '',
      inn: player.inn || player.inning || player.innings || '0',
      kk: Number(player.kk ?? player.so ?? player.strikeout ?? 0),
      bb: Number(player.bb ?? player.walk ?? player.walks ?? 0),
      er: Number(player.er ?? player.earnedRun ?? player.earnedRuns ?? 0),
      hit: Number(player.hit ?? player.hits ?? 0),
      pc: Number(player.pc ?? player.ballCount ?? player.pitchCount ?? player.numPitch ?? player.pitches ?? 0),
      sp: Number(player.sp ?? player.strikeCount ?? player.strikes ?? 0),
    }));
  }

  function buildPlayerMap(raw) {
    const { home, away } = extractLineupPair(raw);
    const homeBatters = home?.batter || home?.batters || [];
    const awayBatters = away?.batter || away?.batters || [];
    const homePitchers = home?.pitcher || home?.pitchers || [];
    const awayPitchers = away?.pitcher || away?.pitchers || [];
    const map = {};
    [...homeBatters, ...awayBatters, ...homePitchers, ...awayPitchers].forEach(player => {
      if (player?.pcode) map[String(player.pcode)] = player.name || player.playerName || '';
    });
    return map;
  }

  function extractCurrentGameState(raw, playerMap = {}) {
    if (!raw) return null;
    const direct = raw.currentGameState || raw.textRelayData?.currentGameState || raw.game?.currentGameState;
    if (direct) return normalizeCurrentGameState(direct, playerMap);
    const relays = findTextRelaysRecursive(raw) || [];
    for (const relay of relays) {
      if (relay?.currentGameState) return normalizeCurrentGameState(relay.currentGameState, playerMap);
      const options = Array.isArray(relay?.textOptions) ? relay.textOptions : [];
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (options[i]?.currentGameState) return normalizeCurrentGameState(options[i].currentGameState, playerMap);
      }
    }
    return null;
  }

  async function fetchSchedule(date) {
    const url = `https://api-gw.sports.naver.com/schedule/games?fields=basic%2Cschedule%2Cbaseball%2CmanualRelayUrl&upperCategoryId=kbaseball&fromDate=${date}&toDate=${date}&size=500`;
    const data = await fetchJson(url);
    return (data?.result?.games || []).filter(game => game.categoryId === 'kbo');
  }

  async function fetchGameDetail(gameId, inning) {
    const inn = Math.max(1, Number(inning) || 1);
    const urls = [
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/text-relay?inning=${inn}&isHighlight=false`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/game-polling?inning=${inn}&isHighlight=false`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/text-relay`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/game-polling`,
    ];

    for (const url of urls) {
      try {
        const data = await fetchJson(url, 7000);
        const result = data?.result;
        if (!result) continue;
        const relays = findTextRelaysRecursive(result) || [];
        if (relays.length || result.currentGameState || result.textRelayData?.currentGameState || result.game || result.homeLineup || result.awayLineup) {
          return result;
        }
      } catch {}
    }
    return null;
  }

  async function fetchLineup(gameId, inning) {
    const inn = Math.max(1, Number(inning) || 1);
    const urls = [
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/preview`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/starting-lineup`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/lineup`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/game-polling?inning=${inn}&isHighlight=false`,
    ];

    for (const url of urls) {
      try {
        const data = await fetchJson(url, 7000);
        const result = data?.result;
        if (!result) continue;
        const pair = extractLineupPair(result);
        const hasHome = (pair.home?.batter || pair.home?.batters || []).length;
        const hasAway = (pair.away?.batter || pair.away?.batters || []).length;
        if (hasHome || hasAway) return result;
      } catch {}
    }
    return null;
  }

  async function fetchGameRecord(gameId) {
    const urls = [
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/game-polling?inning=9&isHighlight=false`,
      `https://api-gw.sports.naver.com/schedule/games/${gameId}/text-relay?inning=9&isHighlight=false`,
    ];

    for (const url of urls) {
      try {
        const data = await fetchJson(url, 7000);
        const result = data?.result;
        if (!result) continue;
        const pair = extractLineupPair(result);
        const count = (pair.home?.batter || pair.home?.batters || []).length + (pair.away?.batter || pair.away?.batters || []).length;
        if (count) return result;
      } catch {}
    }
    return null;
  }

  function extractStarterFromDetail(detail, game, side) {
    if (!detail) return side === 'home'
      ? game?.homeStarterName || game?.homeStarter || null
      : game?.awayStarterName || game?.awayStarter || null;

    const summary = detail[`${side}Summary`];
    if (summary?.pitcherName) return summary.pitcherName;
    if (summary?.name) return summary.name;

    const lineup = detail[`${side}Lineup`] || detail[`${side}TeamLineup`] || detail?.game?.[`${side}Lineup`] || detail?.game?.[`${side}TeamLineup`];
    const pitchers = Array.isArray(lineup?.pitcher) ? lineup.pitcher : Array.isArray(lineup?.pitchers) ? lineup.pitchers : [];
    const starter = pitchers.find(player => player.startYn === 'Y' || player.orderNum === 1 || player.type === 'starter');
    if (starter?.name) return starter.name;
    if (pitchers[0]?.name) return pitchers[0].name;

    return side === 'home'
      ? detail?.game?.homeStarterName || detail?.game?.homeStarter || game?.homeStarterName || game?.homeStarter || null
      : detail?.game?.awayStarterName || detail?.game?.awayStarter || game?.awayStarterName || game?.awayStarter || null;
  }

  function convertGame(game, detail) {
    const away = mapTeam(game.awayTeamCode, game.awayTeamName);
    const home = mapTeam(game.homeTeamCode, game.homeTeamName);
    const gameData = detail?.game || game || {};
    const awayInnRaw = gameData.awayTeamScoreByInning || game.awayTeamScoreByInning || [];
    const homeInnRaw = gameData.homeTeamScoreByInning || game.homeTeamScoreByInning || [];
    const maxInnCount = Math.max(9, awayInnRaw.length, homeInnRaw.length);
    const awayInnings = Array.from({ length: maxInnCount }, (_, i) => {
      const n = safeNumber(awayInnRaw[i]);
      return n === null ? -1 : n;
    });
    const homeInnings = Array.from({ length: maxInnCount }, (_, i) => {
      const n = safeNumber(homeInnRaw[i]);
      return n === null ? -1 : n;
    });

    const playerMap = buildPlayerMap(detail);
    const currentGameState = extractCurrentGameState(detail, playerMap);
    const rawRelays = findTextRelaysRecursive(detail) || [];
    const textRelays = rawRelays.map(item => ({ ...item, resultText: extractResult(item) }));
    const awayScore = safeNumber(game.awayTeamScore) ?? (awayInnings.some(v => v >= 0) ? awayInnings.filter(v => v >= 0).reduce((sum, v) => sum + v, 0) : null);
    const homeScore = safeNumber(game.homeTeamScore) ?? (homeInnings.some(v => v >= 0) ? homeInnings.filter(v => v >= 0).reduce((sum, v) => sum + v, 0) : null);

    return {
      gameId: String(game.gameId || ''),
      date: game.gameDate || '',
      time: game.gameDateTime?.split('T')[1]?.slice(0, 5) || game.gameTime || game.startTime || game.schedule?.startTime || null,
      away,
      home,
      status: detectStatus(game),
      statusCode: game.statusCode || '',
      statusInfo: game.statusInfo || null,
      awayScore,
      homeScore,
      awayInnings,
      homeInnings,
      inningInfo: inningInfoText(game, currentGameState),
      currentGameState,
      textRelays,
      stad: game.stadium || game.stadiumName || game.stadName || game.place || null,
      awayStarter: extractStarterFromDetail(detail, game, 'away'),
      homeStarter: extractStarterFromDetail(detail, game, 'home'),
      winPitcher: gameData.winPitcherName || game.winPitcherName || null,
      losePitcher: gameData.losePitcherName || game.losePitcherName || null,
    };
  }

  async function fetchSeasonStats() {
    const currentYear = kst.getUTCFullYear();
    const endDate = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    const months = [];
    let cursor = new Date(Date.UTC(currentYear, 2, 1));
    const endCursor = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    while (cursor <= endCursor) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth();
      const monthStart = `${y}-${pad(m + 1)}-01`;
      const monthLastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const monthEnd = y === endCursor.getUTCFullYear() && m === endCursor.getUTCMonth()
        ? `${y}-${pad(m + 1)}-${pad(endCursor.getUTCDate())}`
        : `${y}-${pad(m + 1)}-${pad(monthLastDay)}`;
      months.push([monthStart, monthEnd]);
      cursor = new Date(Date.UTC(y, m + 1, 1));
    }

    const batches = await Promise.all(months.map(async ([fromDate, toDate]) => {
      const url = `https://api-gw.sports.naver.com/schedule/games?fields=basic%2Cschedule&upperCategoryId=kbaseball&fromDate=${fromDate}&toDate=${toDate}&size=500`;
      try {
        const data = await fetchJson(url, 9000);
        return (data?.result?.games || []).filter(game => game.categoryId === 'kbo');
      } catch {
        return [];
      }
    }));

    const games = batches.flat().filter(game => {
      const status = detectStatus(game);
      const away = mapTeam(game.awayTeamCode, game.awayTeamName);
      const home = mapTeam(game.homeTeamCode, game.homeTeamName);
      const gameDate = String(game.gameDate || '').slice(0, 10);
      return status === 'FINAL' && gameDate !== todayDash && (isKiaTeam(away) || isKiaTeam(home));
    }).sort((a, b) => String(a.gameDate || '').localeCompare(String(b.gameDate || '')));

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let streak = 0;
    let streakType = null;

    for (const game of games) {
      const kiaHome = mapTeam(game.homeTeamCode, game.homeTeamName) === 'KIA';
      const kiaScore = safeNumber(kiaHome ? game.homeTeamScore : game.awayTeamScore);
      const oppScore = safeNumber(kiaHome ? game.awayTeamScore : game.homeTeamScore);
      if (kiaScore === null || oppScore === null) continue;

      let result;
      if (kiaScore > oppScore) {
        wins += 1;
        result = 'W';
      } else if (kiaScore < oppScore) {
        losses += 1;
        result = 'L';
      } else {
        draws += 1;
        result = 'D';
      }

      if (result === streakType) streak += 1;
      else {
        streakType = result;
        streak = 1;
      }
    }

    const total = wins + losses + draws;
    const decisions = wins + losses;
    const pct = decisions ? (wins / decisions).toFixed(3).replace(/^0/, '') : '.000';
    return { wins, losses, draws, total, pct, streak, streakType };
  }

  try {
    const gameId = query.gameId;
    const inning = query.inning ? parseInt(query.inning, 10) : null;
    const action = String(query.action || '');

    if (action === 'seasonStats') {
      const season = await fetchSeasonStats();
      return res.status(200).json(season);
    }

    // ── 선수 시즌 성적 (타자 / 투수) ──────────────────────────────
    if (action === 'playerStats') {
      const tab       = String(query.tab || 'hitter');       // 'hitter' | 'pitcher'
      const teamCode  = String(query.teamCode  || 'HT');     // HT = KIA
      const seasonCode= String(query.seasonCode|| kst.getUTCFullYear());
      const type      = tab === 'pitcher' ? 'pitcher' : 'hitter';

      // 네이버 스포츠 팀별 선수 성적 API (여러 경로 순차 시도)
      const candidateUrls = [
        `https://api-gw.sports.naver.com/stats/record?fields=basic&upperCategoryId=kbaseball&categoryId=kbo&teamCode=${teamCode}&type=${type}&year=${seasonCode}`,
        `https://api-gw.sports.naver.com/stats/players?upperCategoryId=kbaseball&categoryId=kbo&teamCode=${teamCode}&type=${type}&seasonCode=${seasonCode}`,
        `https://api-gw.sports.naver.com/stats/teams/${teamCode}/players?upperCategoryId=kbaseball&categoryId=kbo&type=${type}&year=${seasonCode}`,
        `https://api-gw.sports.naver.com/kbaseball/teams/${teamCode}/players?fields=basic&type=${type}&seasonCode=${seasonCode}`,
      ];

      let players = null;
      for (const url of candidateUrls) {
        try {
          const data = await fetchJson(url, 8000);
          const r = data?.result || data || {};
          const list = r.seasonPlayerStats || r.playerList || r.players || r.list || r.data || null;
          if (list && Array.isArray(list) && list.length > 0) {
            players = list;
            break;
          }
        } catch {}
      }

      if (!players) {
        return res.status(200).json({ result: { seasonPlayerStats: [] }, _note: 'playerStats endpoint not found' });
      }
      return res.status(200).json({ result: { seasonPlayerStats: players } });
    }

    if (gameId && action === 'lineup') {
      const lineupRaw = await fetchLineup(gameId, inning || 1);
      const recordRaw = lineupRaw ? null : await fetchGameRecord(gameId);
      const source = lineupRaw || recordRaw;
      if (!source) {
        return res.status(404).json({ error: 'Lineup not found' });
      }

      const { home, away } = extractLineupPair(source);
      const homeBatters = home?.batter || home?.batters || [];
      const awayBatters = away?.batter || away?.batters || [];
      const homePitchers = home?.pitcher || home?.pitchers || [];
      const awayPitchers = away?.pitcher || away?.pitchers || [];
      if (!homeBatters.length && !awayBatters.length) {
        return res.status(404).json({ error: 'Lineup not found' });
      }

      const playerMap = buildPlayerMap(source);
      const currentGameState = extractCurrentGameState(source, playerMap);
      return res.status(200).json({
        homeLineup: { batter: parseBatters(homeBatters), pitcher: parsePitchers(homePitchers) },
        awayLineup: { batter: parseBatters(awayBatters), pitcher: parsePitchers(awayPitchers) },
        currentGameState,
        pcodeMap: playerMap,
      });
    }

    if (gameId) {
      const match = String(gameId).match(/^(\d{4})(\d{2})(\d{2})/);
      const gameDateDash = match ? `${match[1]}-${match[2]}-${match[3]}` : todayDash;
      const games = await fetchSchedule(gameDateDash);
      const game = games.find(item => String(item.gameId) === String(gameId));
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const inferredInning = detectStatus(game) === 'FINAL'
        ? 9
        : parseInt(String(game.statusInfo || '').match(/(\d+)/)?.[1] || '1', 10);
      const detail = await fetchGameDetail(gameId, inning || inferredInning);
      return res.status(200).json(convertGame(game, detail));
    }

    const schedule = await fetchSchedule(todayDash);
    const detailMap = {};

    await Promise.all(schedule.map(async game => {
      try {
        if (detectStatus(game) === 'SCHEDULED') {
          const lineup = await fetchLineup(game.gameId, 1);
          if (lineup) detailMap[game.gameId] = lineup;
        } else {
          const detail = await fetchGameDetail(game.gameId, detectStatus(game) === 'FINAL' ? 9 : 1);
          if (detail) detailMap[game.gameId] = detail;
        }
      } catch {}
    }));

    const games = schedule.map(game => convertGame(game, detailMap[game.gameId] || null));
    return res.status(200).json({ games, date: todayStr });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unknown error' });
  }
}
