// KIA Tigers - Live Game & Scoring Moments Pages (Live API)

const { useState, useEffect, useRef } = React;

// ── LIVE GAME PAGE ────────────────────────────────────────
function LiveGamePage({ todayGames }) {
  const kiaGames = KIA_API.filterKIA(todayGames || []);
  const liveOrRecent = kiaGames.find(g => g.status === 'LIVE')
    || kiaGames.find(g => g.status === 'FINAL')
    || kiaGames[0];

  const [gameDetail, setGameDetail] = useState(null);
  const [lineupData, setLineupData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selectedGame, setSelectedGame] = useState(liveOrRecent?.gameId || null);
  const pollRef = useRef(null);

  const load = async (gameId) => {
    if (!gameId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [detail, lineup] = await Promise.all([
        KIA_API.fetchGame(gameId),
        KIA_API.fetchLineup(gameId).catch(() => null),
      ]);
      setGameDetail(detail);
      setLineupData(lineup);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedGame) load(selectedGame);
    // Auto-poll every 30s if live
    pollRef.current = setInterval(() => {
      if (selectedGame && gameDetail?.status === 'LIVE') load(selectedGame);
    }, 30000);
    return () => clearInterval(pollRef.current);
  }, [selectedGame]);

  // Helpers
  const g = gameDetail;
  const gs = g?.currentGameState || lineupData?.currentGameState;
  const isKIAHome = g?.home === 'KIA';
  const kiaScore  = isKIAHome ? g?.homeScore : g?.awayScore;
  const oppScore  = isKIAHome ? g?.awayScore : g?.homeScore;
  const opp       = isKIAHome ? g?.away : g?.home;
  const kiaInnings  = isKIAHome ? g?.homeInnings : g?.awayInnings;
  const oppInnings  = isKIAHome ? g?.awayInnings : g?.homeInnings;

  // Diamond
  const Diamond = ({ gs }) => {
    if (!gs) return null;
    const b1 = gs.base1 > 0, b2 = gs.base2 > 0, b3 = gs.base3 > 0;
    const Base = ({ filled, style }) => (
      <div style={{
        width: 20, height: 20, transform: "rotate(45deg)", borderRadius: 3,
        background: filled ? C.gold : "transparent",
        border: `2px solid ${filled ? C.gold : C.dim}`,
        boxShadow: filled ? `0 0 8px ${C.gold}80` : "none",
        ...style,
      }} />
    );
    return (
      <div style={{ position:"relative", width:72, height:72 }}>
        <div style={{ position:"absolute", top:4,  left:"50%", transform:"translateX(-50%)" }}><Base filled={b2} /></div>
        <div style={{ position:"absolute", top:"50%", right:4,  transform:"translateY(-50%)" }}><Base filled={b1} /></div>
        <div style={{ position:"absolute", top:"50%", left:4,  transform:"translateY(-50%)" }}><Base filled={b3} /></div>
        <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)" }}><Base filled={false} /></div>
      </div>
    );
  };

  const CountDot = ({ filled, color }) => (
    <div style={{ width:12, height:12, borderRadius:"50%", background: filled ? color : "transparent", border:`2px solid ${filled ? color : C.dim}`, boxShadow: filled ? `0 0 6px ${color}80` : "none" }} />
  );

  // Line score table
  const LineScore = ({ g, kiaInnings, oppInnings }) => {
    if (!g) return null;
    const maxInn = Math.max(9, (kiaInnings||[]).length, (oppInnings||[]).length);
    const inns = Array.from({ length: maxInn }, (_, i) => i);
    return (
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr>
              <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:C.dim, padding:"4px 8px", textAlign:"left", minWidth:48 }}>팀</th>
              {inns.map(i => (
                <th key={i} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, padding:"4px 6px", textAlign:"center", minWidth:28, color:C.muted, fontWeight:500 }}>{i+1}</th>
              ))}
              <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:C.text, padding:"4px 10px", textAlign:"center", fontWeight:700, borderLeft:`1px solid ${C.border}` }}>R</th>
              <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:C.muted, padding:"4px 10px", textAlign:"center" }}>H</th>
              <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:C.muted, padding:"4px 10px", textAlign:"center" }}>E</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: g.away, inns: g.awayInnings || [], r: g.awayScore, isKIA: g.away === 'KIA' },
              { label: g.home, inns: g.homeInnings || [], r: g.homeScore, isKIA: g.home === 'KIA' },
            ].map(row => (
              <tr key={row.label}>
                <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, color: row.isKIA ? C.red : C.muted, padding:"6px 8px" }}>{row.label}</td>
                {inns.map(i => (
                  <td key={i} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:14, color: row.inns[i] > 0 ? C.text : C.dim, padding:"6px 6px", textAlign:"center" }}>
                    {row.inns[i] === -1 || row.inns[i] == null ? "—" : row.inns[i]}
                  </td>
                ))}
                <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:16, color: row.isKIA ? C.red : C.text, padding:"6px 10px", textAlign:"center", borderLeft:`1px solid ${C.border}` }}>{row.r ?? '—'}</td>
                <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:13, color:C.muted, padding:"6px 10px", textAlign:"center" }}>—</td>
                <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:13, color:C.muted, padding:"6px 10px", textAlign:"center" }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!liveOrRecent && !loading) {
    return (
      <PageWrap>
        <div style={{ padding:"60px 0", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⚾</div>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:16, color:C.muted }}>오늘 KIA 경기가 없어요</div>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {/* Game selector */}
      {kiaGames.length > 1 && (
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {kiaGames.map(game => (
            <button key={game.gameId} onClick={() => setSelectedGame(game.gameId)} style={{
              padding:"8px 16px", borderRadius:8, border:`1px solid ${selectedGame === game.gameId ? C.red : C.border}`,
              background: selectedGame === game.gameId ? `${C.red}20` : C.card,
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14,
              color: selectedGame === game.gameId ? C.red : C.muted, cursor:"pointer",
            }}>{game.away} vs {game.home}</button>
          ))}
        </div>
      )}

      {/* Live header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        {g?.status === 'LIVE' && <div style={{ width:8, height:8, borderRadius:"50%", background:C.red, animation:"livePulse 1.5s ease-in-out infinite" }} />}
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, color: g?.status === 'LIVE' ? C.red : C.muted, letterSpacing:"2px" }}>
          {g?.status === 'LIVE' ? 'LIVE' : g?.status === 'FINAL' ? '경기 종료' : '경기 예정'}
        </span>
        {g?.status === 'LIVE' && <Badge>{g.inningInfo}</Badge>}
        <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.dim }}>
          {g ? `${fmtDate(g.date)} · ${HOME_STADIUM[g.home] || g.home}` : ''}
        </span>
      </div>

      {loading ? (
        <Card style={{ overflow:"hidden" }}><LoadingCard rows={6} /></Card>
      ) : error ? (
        <Card><ErrorMsg msg={error} onRetry={() => load(selectedGame)} /></Card>
      ) : g ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
          {/* Main scoreboard */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Big score */}
            <Card style={{ padding:"32px 36px", background:`linear-gradient(135deg, #0C0C0E 0%, #1a0005 100%)`, border:"1px solid rgba(232,0,29,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
                {[
                  { team:g.away, score:g.awayScore, isKIA:g.away==='KIA', align:"left" },
                  { team:g.home, score:g.homeScore, isKIA:g.home==='KIA', align:"right" },
                ].map((side,idx) => (
                  <React.Fragment key={side.team}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center", marginBottom:8 }}>
                        <TeamLogo team={side.team} size={44} />
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, color: side.isKIA ? C.text : C.muted }}>{side.team}</span>
                      </div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:88, lineHeight:1, letterSpacing:"-4px", color: side.isKIA ? C.red : C.text, textShadow: side.isKIA ? `0 0 40px ${C.redGlow}` : "none" }}>
                        {side.score ?? '—'}
                      </div>
                      <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted, marginTop:4 }}>{idx===0?'원정':'홈'}</div>
                    </div>
                    {idx===0 && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:18, color:C.dim }}>VS</div>}
                  </React.Fragment>
                ))}
              </div>
              <LineScore g={g} />
            </Card>

            {/* Text relay */}
            {(g.textRelays?.length > 0) && (
              <Card style={{ padding:"24px" }}>
                <SectionHead title="플레이 로그" sub="최근 주요 장면" />
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {g.textRelays.slice(0, 12).map((relay, i) => {
                    const text = relay.resultText || relay.text || relay.title || '';
                    if (!text) return null;
                    const isScore = /홈런|안타|득점|타점/.test(text);
                    return (
                      <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom: i < 11 ? `1px solid ${C.border}` : "none", opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.07) }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5, background: isScore ? C.red : C.border, boxShadow: isScore ? `0 0 6px ${C.redGlow}` : "none" }} />
                        <div style={{ flex:1 }}>
                          {relay.inning && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:C.muted, marginRight:8 }}>{relay.inning}회</span>}
                          <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color: isScore ? C.text : C.muted, lineHeight:1.5 }}>{text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Side panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Current situation */}
            {gs && g.status === 'LIVE' && (
              <Card style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color:C.muted, letterSpacing:"1px", marginBottom:16 }}>경기 상황</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  {/* BSO */}
                  <div>
                    {[["볼", gs.ball ?? 0, "#22C55E", 4],["스트라이크", gs.strike ?? 0, C.gold, 3],["아웃", gs.out ?? 0, C.red, 3]].map(([label, val, color, max]) => (
                      <div key={label} style={{ marginBottom:8 }}>
                        <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:9, color:C.muted, marginBottom:4 }}>{label}</div>
                        <div style={{ display:"flex", gap:4 }}>
                          {Array.from({length: max}, (_,i) => <CountDot key={i} filled={i < val} color={color} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Diamond gs={gs} />
                </div>

                {/* Batter */}
                {gs.batterName && (
                  <div style={{ background:C.surface, borderRadius:8, padding:"12px", marginBottom:10 }}>
                    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:10, color:C.muted, marginBottom:6 }}>타자</div>
                    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700, fontSize:16, color:C.text }}>{gs.batterName}</div>
                  </div>
                )}

                {/* Pitcher */}
                {gs.pitcherName && (
                  <div style={{ background:C.surface, borderRadius:8, padding:"12px" }}>
                    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:10, color:C.muted, marginBottom:6 }}>투수</div>
                    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700, fontSize:16, color:C.text }}>{gs.pitcherName}</div>
                  </div>
                )}
              </Card>
            )}

            {/* Lineup */}
            {lineupData && (() => {
              const kiaKey = g.home === 'KIA' ? 'homeLineup' : 'awayLineup';
              const kiaLineup = lineupData[kiaKey];
              const batters = kiaLineup?.batter || [];
              if (!batters.length) return null;
              return (
                <Card style={{ padding:"22px" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color:C.muted, letterSpacing:"1px", marginBottom:14 }}>KIA 타순</div>
                  {batters.slice(0,9).map((p, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"7px 0", borderBottom: i < 8 ? `1px solid ${C.border}` : "none",
                      background: p.name === gs?.batterName ? `${C.red}10` : "transparent",
                      borderRadius:4, paddingLeft: p.name === gs?.batterName ? 6 : 0,
                    }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color:C.dim, minWidth:14 }}>{p.batOrder || i+1}</span>
                      {p.name === gs?.batterName && <div style={{ width:4, height:4, borderRadius:"50%", background:C.red, flexShrink:0 }} />}
                      <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color: p.name === gs?.batterName ? C.text : C.muted, fontWeight: p.name === gs?.batterName ? 600 : 400, flex:1 }}>{p.name}</span>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:C.dim }}>{p.posName || ''}</span>
                      {p.hit != null && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:C.muted }}>{p.ab}타{p.hit}안</span>}
                    </div>
                  ))}
                </Card>
              );
            })()}

            {/* Pitcher stats */}
            {lineupData && (() => {
              const kiaKey = g.home === 'KIA' ? 'homeLineup' : 'awayLineup';
              const pitchers = lineupData[kiaKey]?.pitcher || [];
              if (!pitchers.length) return null;
              return (
                <Card style={{ padding:"22px" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color:C.muted, letterSpacing:"1px", marginBottom:14 }}>KIA 투수</div>
                  {pitchers.map((p, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom: i < pitchers.length-1 ? `1px solid ${C.border}` : "none" }}>
                      <div>
                        <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{p.name}</span>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:C.muted, marginLeft:8 }}>{p.inn || '—'}이닝</span>
                      </div>
                      <div style={{ display:"flex", gap:12 }}>
                        {p.pc > 0 && <div style={{ textAlign:"center" }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:18, color: p.pc > 100 ? C.red : C.text }}>{p.pc}</div>
                          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:9, color:C.muted }}>투구수</div>
                        </div>}
                        {p.er != null && <div style={{ textAlign:"center" }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:16, color:C.muted }}>{p.er}</div>
                          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:9, color:C.muted }}>실점</div>
                        </div>}
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })()}
          </div>
        </div>
      ) : null}
    </PageWrap>
  );
}

// ── SCORING MOMENTS PAGE ──────────────────────────────────
function ScoringMomentsPage({ todayGames }) {
  const kiaGames = KIA_API.filterKIA(todayGames || []).filter(g => g.status === 'FINAL' || g.status === 'LIVE');
  const [selectedGameId, setSelectedGameId] = useState(kiaGames[0]?.gameId || null);
  const [gameDetail, setGameDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRelay, setSelectedRelay] = useState(0);

  useEffect(() => {
    if (!selectedGameId) { setLoading(false); return; }
    setLoading(true); setError(null);
    KIA_API.fetchGame(selectedGameId)
      .then(d => { setGameDetail(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedGameId]);

  // Filter relays with actual scoring info
  const g = gameDetail;
  const relays = g?.textRelays || [];
  const scoringRelays = relays.filter(r => {
    const text = r.resultText || r.text || r.title || '';
    return /홈런|적시타|득점|타점|안타/.test(text);
  });

  const PitchZoneViz = ({ zone }) => {
    const zones = {
      "외각 낮음":{x:75,y:72}, "내각 낮음":{x:25,y:72}, "중앙 낮음":{x:50,y:72},
      "외각 중간":{x:75,y:50}, "내각 중간":{x:25,y:50}, "중앙 중간":{x:50,y:50},
      "외각 높음":{x:75,y:28}, "내각 높음":{x:25,y:28}, "중앙 높음":{x:50,y:28},
    };
    const pos = zones[zone] || {x:50, y:50};
    return (
      <div style={{ display:"inline-block" }}>
        <div style={{ position:"relative", width:88, height:88, border:`2px solid ${C.dim}`, borderRadius:4, background:C.surface }}>
          {[33,66].map(p => (
            <React.Fragment key={p}>
              <div style={{ position:"absolute", left:`${p}%`, top:0, bottom:0, width:1, background:C.border }} />
              <div style={{ position:"absolute", top:`${p}%`, left:0, right:0, height:1, background:C.border }} />
            </React.Fragment>
          ))}
          <div style={{
            position:"absolute", left:`${pos.x}%`, top:`${pos.y}%`,
            transform:"translate(-50%,-50%)",
            width:14, height:14, borderRadius:"50%",
            background:C.red, boxShadow:`0 0 8px ${C.redGlow}`,
            border:"2px solid #fff",
          }} />
        </div>
        {zone && <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:9, color:C.muted, textAlign:"center", marginTop:3 }}>{zone}</div>}
      </div>
    );
  };

  if (!kiaGames.length && !loading) {
    return (
      <PageWrap>
        <SectionHead title="득점 장면" sub="이닝별 득점 상세 기록" />
        <Card style={{ padding:40, textAlign:"center" }}>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted }}>오늘 완료된 KIA 경기가 없어요</div>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.dim, marginTop:6 }}>경기 종료 후 득점 장면 기록이 표시됩니다</div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <SectionHead title="득점 장면" sub="이닝별 주요 플레이 기록" />

      {/* Game header */}
      {g && (
        <Card style={{ padding:"18px 24px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted }}>{fmtDate(g.date)}</span>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, color: g.away === 'KIA' ? C.red : C.muted }}>{g.away}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:32, color:C.text }}>{g.awayScore ?? '?'} - {g.homeScore ?? '?'}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, color: g.home === 'KIA' ? C.red : C.muted }}>{g.home}</span>
            </div>
            <Badge>{g.status === 'FINAL' ? '최종' : g.status === 'LIVE' ? 'LIVE' : '—'}</Badge>
          </div>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:12, color:C.muted }}>
            주요 플레이 {scoringRelays.length}건
          </div>
        </Card>
      )}

      {loading ? <Card><LoadingCard rows={6} /></Card> : error ? (
        <Card><ErrorMsg msg={error} onRetry={() => { setLoading(true); KIA_API.fetchGame(selectedGameId).then(d=>{setGameDetail(d);setLoading(false);}).catch(e=>{setError(e.message);setLoading(false);}); }} /></Card>
      ) : scoringRelays.length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted }}>득점 장면 데이터가 없어요</div>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.dim, marginTop:6 }}>라이브 경기 중에는 실시간으로 업데이트됩니다</div>
        </Card>
      ) : (
        <div>
          {/* Scoring relay timeline */}
          <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
            {scoringRelays.map((r, i) => (
              <button key={i} onClick={() => setSelectedRelay(i)} style={{
                flexShrink:0, padding:"8px 12px", borderRadius:8,
                border:`1px solid ${selectedRelay === i ? C.red : C.border}`,
                background: selectedRelay === i ? `${C.red}20` : C.card,
                cursor:"pointer", transition:"all 0.15s",
              }}>
                {r.inning && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:C.muted, marginBottom:2 }}>{r.inning}회</div>}
                <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color: selectedRelay === i ? C.red : C.muted, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {(r.resultText || r.text || '').slice(0, 12)}
                </div>
              </button>
            ))}
          </div>

          {/* Detail of selected relay */}
          {(() => {
            const r = scoringRelays[selectedRelay];
            if (!r) return null;
            const text = r.resultText || r.text || r.title || '';
            const isKIAPlay = text.includes(g?.home === 'KIA' ? (g?.home) : (g?.away));
            return (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <Card style={{ padding:"28px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                    <div>
                      {r.inning && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:32, color:C.red, lineHeight:1 }}>{r.inning}회</div>}
                    </div>
                    <Badge color={C.red}>득점 장면</Badge>
                  </div>
                  <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:16, color:C.text, lineHeight:1.8, padding:"16px", background:`${C.red}10`, borderRadius:8, border:`1px solid ${C.red}20` }}>
                    {text}
                  </div>
                </Card>

                <Card style={{ padding:"28px" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, color:C.muted, letterSpacing:"1px", marginBottom:20 }}>투구 위치 (추정)</div>
                  <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
                    <PitchZoneViz zone={null} />
                    <div>
                      <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.dim, lineHeight:1.7 }}>
                        투구 위치 데이터는<br/>네이버 스포츠 API에서<br/>제공되지 않습니다
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Full relay list */}
          <Card style={{ padding:"24px", marginTop:20 }}>
            <SectionHead title="전체 득점 플레이" sub={`총 ${scoringRelays.length}건`} />
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {scoringRelays.map((r, i) => {
                const text = r.resultText || r.text || r.title || '';
                const isHR = /홈런/.test(text);
                return (
                  <div key={i} onClick={() => setSelectedRelay(i)} style={{
                    display:"flex", gap:14, padding:"12px 8px",
                    borderBottom: i < scoringRelays.length-1 ? `1px solid ${C.border}` : "none",
                    cursor:"pointer",
                    background: selectedRelay === i ? `${C.red}08` : "transparent",
                    borderRadius:6, transition:"background 0.1s",
                  }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5, background: isHR ? C.gold : C.red, boxShadow: isHR ? `0 0 6px ${C.gold}80` : `0 0 4px ${C.redGlow}` }} />
                    <div style={{ flex:1 }}>
                      {r.inning && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:C.muted, marginRight:8 }}>{r.inning}회</span>}
                      {isHR && <Badge color={C.gold} small>홈런</Badge>}
                      {/적시타/.test(text) && <Badge color={C.red} small style={{marginLeft:4}}>적시타</Badge>}
                      <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.text, marginLeft:6, lineHeight:1.5 }}>{text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </PageWrap>
  );
}

Object.assign(window, { LiveGamePage, ScoringMomentsPage });
