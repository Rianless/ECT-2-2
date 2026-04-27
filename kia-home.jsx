// KIA Tigers - Home & Schedule Pages (Live API)

const { useState, useEffect, useCallback } = React;

// ── HOME PAGE ─────────────────────────────────────────────
function HomePage({ setPage, todayGames }) {
  const [season, setSeason] = useState(null);
  const [seasonErr, setSeasonErr] = useState(null);
  const [playerStats, setPlayerStats] = useState({ hitters: [], pitchers: [] });
  const [statsLoading, setStatsLoading] = useState(true);

  // Season W/L stats
  useEffect(() => {
    KIA_API.fetchSeasonStats()
      .then(d => setSeason(d))
      .catch(e => setSeasonErr(e.message));
  }, []);

  // Player stats for spotlight
  useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      KIA_API.fetchPlayerStats('hitter').catch(() => []),
      KIA_API.fetchPlayerStats('pitcher').catch(() => []),
    ]).then(([hitters, pitchers]) => {
      setPlayerStats({ hitters, pitchers });
      setStatsLoading(false);
    });
  }, []);

  const kiaGames = KIA_API.filterKIA(todayGames);
  const liveGame = kiaGames.find(g => g.status === 'LIVE');
  const nextGame = kiaGames.find(g => g.status === 'SCHEDULED');
  const recentResults = (todayGames || [])
    .filter(g => (g.home === 'KIA' || g.away === 'KIA') && g.status === 'FINAL')
    .slice(0, 5);

  // Top players
  const topHitters  = [...(playerStats.hitters)].sort((a,b) => Number(b.hitterHra||0) - Number(a.hitterHra||0)).slice(0,3);
  const topPitchers = [...(playerStats.pitchers)].sort((a,b) => Number(a.pitcherEra||99) - Number(b.pitcherEra||99)).slice(0,1);

  const wins   = season?.wins   ?? '—';
  const losses = season?.losses ?? '—';
  const draws  = season?.draws  ?? '—';
  const pct    = season?.pct    ?? '.---';
  const streak = season ? streakLabel(season.streakType, season.streak) : '—';

  return (
    <PageWrap>
      {/* HERO */}
      <div style={{
        background: `linear-gradient(135deg, ${C.redDark} 0%, #1a0005 50%, ${C.bg} 100%)`,
        borderRadius: 20, padding: "48px 48px 40px", marginBottom: 32,
        position: "relative", overflow: "hidden",
        border: `1px solid rgba(232,0,29,0.2)`,
      }}>
        <div style={{
          position:"absolute", top:0, right:0, width:400, height:"100%",
          background:"radial-gradient(ellipse at top right, rgba(232,0,29,0.15) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>
        <div style={{
          position:"absolute", bottom:-40, right:60,
          fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
          fontSize:220, color:"rgba(255,255,255,0.03)", lineHeight:1,
          userSelect:"none", letterSpacing:"-10px",
        }}>TIGERS</div>

        <div style={{ display:"flex", gap:48, alignItems:"flex-start", flexWrap:"wrap", position:"relative" }}>
          {/* Next game info */}
          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:4, height:16, background:C.red, borderRadius:2 }}/>
              <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:12, color:"rgba(255,255,255,0.55)", letterSpacing:"1px" }}>
                {liveGame ? "진행중" : nextGame ? "다음 경기" : "오늘 경기 없음"}
              </span>
            </div>

            {liveGame ? (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:36, color:C.red }}>{liveGame.home}</span>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:48, color:C.text, lineHeight:1 }}>
                      {liveGame.homeScore} - {liveGame.awayScore}
                    </div>
                  </div>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:36, color:"rgba(255,255,255,0.5)" }}>{liveGame.away}</span>
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  <Badge>{liveGame.inningInfo || 'LIVE'}</Badge>
                  <button onClick={() => setPage('live')} style={{
                    background:C.red, color:"#fff", border:"none",
                    padding:"5px 16px", borderRadius:20,
                    fontFamily:"'Noto Sans KR',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer",
                  }}>라이브 보기 →</button>
                </div>
              </div>
            ) : nextGame ? (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:36, color:"#fff" }}>{nextGame.away}</span>
                  <span style={{ color:"rgba(255,255,255,0.4)", fontSize:18 }}>VS</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:36, color:"rgba(255,255,255,0.5)" }}>{nextGame.home}</span>
                </div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  {[
                    ["📅", fmtDate(nextGame.date)],
                    ["⏰", nextGame.time || "—"],
                    ["📍", HOME_STADIUM[nextGame.home] || nextGame.home],
                  ].map(([icon,txt]) => (
                    <span key={txt} style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:12, color:"rgba(255,255,255,0.7)" }}>{icon} {txt}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:16, color:"rgba(255,255,255,0.5)" }}>
                오늘 예정된 경기가 없습니다
              </div>
            )}
          </div>

          {/* Countdown */}
          {nextGame && nextGame.date && nextGame.time && (
            <div style={{ flexShrink:0 }}>
              <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:10 }}>경기 시작까지</div>
              <Countdown targetDatetime={`${String(nextGame.date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}T${nextGame.time}:00+09:00`} />
            </div>
          )}

          {/* Season record */}
          <div style={{
            background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"20px 28px",
            border:"1px solid rgba(255,255,255,0.08)", flexShrink:0,
          }}>
            <div style={{ display:"flex", gap:24, marginBottom:12 }}>
              {[
                { label:"승률", val:pct, color:C.text },
                { label:"연속", val:streak, color: season?.streakType === 'W' ? C.red : C.muted },
              ].map(({label,val,color}) => (
                <div key={label} style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:28, color, lineHeight:1 }}>{val}</div>
                  <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:20,
              color:"rgba(255,255,255,0.7)", textAlign:"center",
              borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:10,
            }}>
              {season ? `${wins}W · ${losses}L · ${draws}D` : <Skeleton h={20} w={100} />}
            </div>
          </div>
        </div>
      </div>

      {/* TOP PLAYERS */}
      <Card style={{ padding:"24px", marginBottom:20 }}>
        <SectionHead title="시즌 선수 성적" sub="2026 KBO 정규시즌 KIA 기준"
          action="전체 선수단" onAction={() => setPage("roster")} />
        {statsLoading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {[0,1,2,3].map(i => <Skeleton key={i} h={100} />)}
          </div>
        ) : playerStats.hitters.length === 0 ? (
          <ErrorMsg msg="선수 데이터를 불러오지 못했어요" onRetry={() => {
            setStatsLoading(true);
            Promise.all([
              KIA_API.fetchPlayerStats('hitter').catch(() => []),
              KIA_API.fetchPlayerStats('pitcher').catch(() => []),
            ]).then(([hitters, pitchers]) => { setPlayerStats({ hitters, pitchers }); setStatsLoading(false); });
          }} />
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:16 }}>
            {[...topHitters, ...topPitchers].map((p, i) => {
              const isPitcher = i === topHitters.length;
              const val = isPitcher ? Number(p.pitcherEra).toFixed(2) : Number(p.hitterHra).toFixed(3).replace(/^0/,'');
              return (
                <div key={p.playerName + i} style={{
                  background:C.surface, borderRadius:10, padding:"16px",
                  border:`1px solid ${C.border}`, textAlign:"center",
                }}>
                  <div style={{
                    width:48, height:48, borderRadius:"50%", margin:"0 auto 10px",
                    background:`linear-gradient(135deg, ${C.red}40, ${C.redDark}80)`,
                    border:`2px solid ${C.red}60`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:20, color:C.text,
                  }}>{i + 1}</div>
                  <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700, fontSize:14, color:C.text, marginBottom:2 }}>{p.playerName}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:30, color:C.red, lineHeight:1, margin:"8px 0 2px" }}>{val}</div>
                  <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted }}>{isPitcher ? "ERA" : "타율"}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent results + Today all games */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Today's KIA games */}
        <Card style={{ padding:"24px" }}>
          <SectionHead title="오늘 경기" sub={new Date().toLocaleDateString('ko-KR', {month:'long', day:'numeric', weekday:'short'})} />
          {kiaGames.length === 0 ? (
            <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted, padding:"20px 0", textAlign:"center" }}>
              오늘 KIA 경기 없음
            </div>
          ) : kiaGames.map((g, i) => (
            <div key={g.gameId} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 0",
              borderBottom: i < kiaGames.length-1 ? `1px solid ${C.border}` : "none",
            }}>
              <TeamLogo team={g.away} size={28} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>
                  {g.away}
                  {g.status !== 'SCHEDULED' && <span style={{ margin:"0 8px", color:C.muted }}>
                    {g.awayScore} - {g.homeScore}
                  </span>}
                  {g.status === 'SCHEDULED' && <span style={{ color:C.dim, margin:"0 8px", fontSize:12 }}>vs</span>}
                  {g.home}
                </div>
                <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted }}>
                  {HOME_STADIUM[g.home] || g.home} · {g.time || ''}
                </div>
              </div>
              <Badge color={
                g.status === 'LIVE' ? C.red :
                g.status === 'FINAL' ? C.dim : C.muted
              } small>{
                g.status === 'LIVE' ? 'LIVE' :
                g.status === 'FINAL' ? '종료' : '예정'
              }</Badge>
            </div>
          ))}
        </Card>

        {/* All today's games */}
        <Card style={{ padding:"24px" }}>
          <SectionHead title="오늘 전체 경기" sub="KBO 전 경기" action="일정 보기" onAction={() => setPage("schedule")} />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(todayGames || []).filter(g => !['KIA'].includes(g.home) || true).slice(0,5).map((g,i) => (
              <div key={g.gameId || i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:12, color:C.muted, minWidth:28 }}>{fmtDate(g.date)}</span>
                <div style={{ flex:1, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:14, color:C.text }}>
                  <span style={{ color: g.away === 'KIA' ? C.red : C.text }}>{g.away}</span>
                  {g.status !== 'SCHEDULED' ? (
                    <span style={{ color:C.muted, margin:"0 6px" }}>{g.awayScore}-{g.homeScore}</span>
                  ) : (
                    <span style={{ color:C.dim, margin:"0 6px", fontSize:11 }}> vs </span>
                  )}
                  <span style={{ color: g.home === 'KIA' ? C.red : C.text }}>{g.home}</span>
                </div>
                <Badge color={g.status === 'LIVE' ? C.red : C.dim} small>
                  {g.status === 'LIVE' ? 'LIVE' : g.status === 'FINAL' ? '종료' : g.time || '예정'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrap>
  );
}

// ── SCHEDULE PAGE ─────────────────────────────────────────
function SchedulePage() {
  const [view, setView] = useState("upcoming");
  const [dateGames, setDateGames] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch a range of dates around today
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}${m}${dd}`;
  });

  useEffect(() => {
    setLoading(true);
    const todayStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    // Just fetch today and nearby; lazy load on tab switch
    KIA_API.fetchToday()
      .then(d => {
        const games = d.games || [];
        const kia = games.filter(g => g.home === 'KIA' || g.away === 'KIA');
        setDateGames(prev => ({ ...prev, [todayStr]: kia }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allGames = Object.values(dateGames).flat();
  const upcoming = allGames.filter(g => g.status === 'SCHEDULED');
  const results  = allGames.filter(g => g.status === 'FINAL');

  const GameRow = ({ g }) => {
    const isKIAHome = g.home === 'KIA';
    const opp = isKIAHome ? g.away : g.home;
    const kiaScore = isKIAHome ? g.homeScore : g.awayScore;
    const oppScore = isKIAHome ? g.awayScore : g.homeScore;
    const won = g.status === 'FINAL' && kiaScore > oppScore;
    const lost = g.status === 'FINAL' && kiaScore < oppScore;

    return (
      <Card style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
          {/* Date */}
          <div style={{ minWidth:70, textAlign:"center", flexShrink:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:22, color:C.text, lineHeight:1 }}>
              {fmtDate(g.date)}
            </div>
            <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted, marginTop:2 }}>
              {fmtDay(g.date)}요일
            </div>
          </div>

          {/* Teams */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:12 }}>
            <TeamLogo team={g.away} size={36} />
            <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:16, fontWeight: g.away === 'KIA' ? 700 : 400, color: g.away === 'KIA' ? C.text : C.muted }}>{g.away}</span>

            <div style={{ textAlign:"center", minWidth:70 }}>
              {g.status === 'FINAL' ? (
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:28, color:C.text, letterSpacing:"-1px" }}>
                  {g.awayScore} - {g.homeScore}
                </div>
              ) : g.status === 'LIVE' ? (
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:28, color:C.red }}>
                    {g.awayScore ?? '·'} - {g.homeScore ?? '·'}
                  </div>
                  <Badge small>{g.inningInfo || 'LIVE'}</Badge>
                </div>
              ) : (
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:18, color:C.dim }}>VS</div>
              )}
            </div>

            <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:16, fontWeight: g.home === 'KIA' ? 700 : 400, color: g.home === 'KIA' ? C.text : C.muted }}>{g.home}</span>
            <TeamLogo team={g.home} size={36} />
          </div>

          {/* Meta */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
            {g.status === 'SCHEDULED' && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:16, color:C.muted }}>{g.time}</span>}
            <span style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted }}>{HOME_STADIUM[g.home] || g.home}</span>
            {g.status === 'FINAL' && (
              <div style={{
                padding:"4px 14px", borderRadius:20,
                background: won ? `${C.red}20` : `${C.dim}20`,
                border:`1px solid ${won ? C.red+'50' : C.border}`,
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:14,
                color: won ? C.red : C.muted,
              }}>{won ? '승' : lost ? '패' : '무'}</div>
            )}
            {g.status === 'LIVE' && <Badge>LIVE</Badge>}
          </div>

          {/* Starters */}
          {(g.awayStarter || g.homeStarter) && (
            <div style={{ width:"100%", fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.dim, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
              선발: {g.awayStarter || '미정'} vs {g.homeStarter || '미정'}
              {g.winPitcher && <span style={{ marginLeft:12, color:C.muted }}>승 {g.winPitcher}</span>}
              {g.losePitcher && <span style={{ marginLeft:8, color:C.muted }}>패 {g.losePitcher}</span>}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <PageWrap>
      <SectionHead title="경기 일정 & 결과" sub="2026 KBO 정규시즌 KIA 타이거즈" />

      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, borderRadius:10, padding:4, width:"fit-content" }}>
        {[["upcoming","예정 경기"],["results","경기 결과"]].map(([id,label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            padding:"8px 20px", borderRadius:7, border:"none", cursor:"pointer",
            fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, fontWeight:600,
            background: view === id ? C.red : "transparent",
            color: view === id ? "#fff" : C.muted, transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[0,1,2].map(i => <Card key={i} style={{ overflow:"hidden" }}><LoadingCard rows={3} /></Card>)}
        </div>
      ) : (view === "upcoming" ? upcoming : results).length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted }}>
            {view === "upcoming" ? "예정된 경기 데이터가 없어요" : "결과 데이터가 없어요"}
          </div>
          <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.dim, marginTop:6 }}>
            Vercel 배포 환경에서 실시간 데이터가 연결됩니다
          </div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {(view === "upcoming" ? upcoming : results).map((g, i) => (
            <GameRow key={g.gameId || i} g={g} />
          ))}
        </div>
      )}
    </PageWrap>
  );
}

Object.assign(window, { HomePage, SchedulePage });
