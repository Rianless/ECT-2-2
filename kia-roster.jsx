// KIA Tigers - Roster & Stats Pages (Live API)

const { useState, useEffect } = React;

// ── ROSTER PAGE ───────────────────────────────────────────
function RosterPage() {
  const [tab, setTab] = useState("hitter");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = (t) => {
    setLoading(true); setError(null); setSelected(null);
    KIA_API.fetchPlayerStats(t)
      .then(d => { setPlayers(d || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(tab); }, [tab]);

  // hitter columns
  const hitterCols = [
    { key:"playerName", label:"선수", left:true },
    { key:"hitterHra",  label:"타율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—' },
    { key:"hitterGame", label:"경기" },
    { key:"hitterHit",  label:"안타" },
    { key:"hitterHr",   label:"홈런", accent:true },
    { key:"hitterRbi",  label:"타점", accent:true },
    { key:"hitterRun",  label:"득점" },
    { key:"hitterBb",   label:"볼넷" },
    { key:"hitterSb",   label:"도루" },
    { key:"hitterObp",  label:"출루율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—' },
    { key:"hitterSlg",  label:"장타율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—' },
  ];

  // pitcher columns
  const pitcherCols = [
    { key:"playerName",  label:"선수",  left:true },
    { key:"pitcherEra",  label:"ERA",  fmt: v => v != null ? Number(v).toFixed(2) : '—', accent:true },
    { key:"pitcherGame", label:"경기" },
    { key:"pitcherWin",  label:"승",   accent:true },
    { key:"pitcherLose", label:"패" },
    { key:"pitcherSv",   label:"세이브" },
    { key:"pitcherHld",  label:"홀드" },
    { key:"pitcherIp",   label:"이닝" },
    { key:"pitcherKk",   label:"탈삼진" },
    { key:"pitcherBb",   label:"볼넷" },
    { key:"pitcherWhip", label:"WHIP", fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  ];

  const cols = tab === "hitter" ? hitterCols : pitcherCols;
  const sortKey = tab === "hitter" ? "hitterHra" : "pitcherEra";
  const sorted = [...players].sort((a,b) =>
    tab === "hitter"
      ? Number(b[sortKey]||0) - Number(a[sortKey]||0)
      : Number(a[sortKey]||99) - Number(b[sortKey]||99)
  );

  // Detail modal using selected player from table
  const ModalDetail = () => {
    const p = selected;
    if (!p) return null;
    return (
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:24,
      }} onClick={() => setSelected(null)}>
        <div style={{
          background:C.card, border:`1px solid ${C.red}40`,
          borderRadius:20, padding:32, maxWidth:460, width:"100%", position:"relative",
          maxHeight:"80vh", overflowY:"auto",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${C.red}, transparent)`, borderRadius:"20px 20px 0 0" }}/>
          <button onClick={() => setSelected(null)} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>

          <div style={{ marginTop:8, marginBottom:24 }}>
            <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700, fontSize:22, color:C.text, marginBottom:6 }}>{p.playerName}</div>
            {p.positionName && <Badge small color={tab === "hitter" ? C.red : "#A855F7"}>{p.positionName}</Badge>}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {cols.filter(c => c.key !== "playerName").map(c => {
              const raw = p[c.key];
              const val = c.fmt ? c.fmt(raw) : (raw != null ? raw : "—");
              return (
                <div key={c.key} style={{ background:C.surface, borderRadius:8, padding:"12px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, color: c.accent ? C.red : C.text }}>{val}</div>
                  <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:10, color:C.muted, marginTop:2 }}>{c.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Th = ({c}) => (
    <th style={{
      fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, fontWeight:700,
      color: c.key === sortKey ? C.red : C.muted,
      padding:"9px 10px", textAlign: c.left ? "left" : "center",
      borderBottom:`1px solid ${C.border}`,
      whiteSpace:"nowrap", cursor:"default",
    }}>{c.label}</th>
  );

  return (
    <PageWrap>
      <SectionHead title="선수단 성적" sub="2026 KBO 정규시즌 KIA 타이거즈" />

      {/* Tab */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, borderRadius:10, padding:4, width:"fit-content" }}>
        {[["hitter","타자"],["pitcher","투수"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"8px 24px", borderRadius:7, border:"none", cursor:"pointer",
            fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, fontWeight:600,
            background: tab === id ? C.red : "transparent",
            color: tab === id ? "#fff" : C.muted, transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      <Card style={{ overflow:"hidden" }}>
        {loading ? <LoadingCard rows={10} /> : error ? (
          <ErrorMsg msg={error} onRetry={() => load(tab)} />
        ) : sorted.length === 0 ? (
          <div style={{ padding:"40px", textAlign:"center", fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, color:C.muted }}>선수 데이터가 없어요</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.surface }}>
                  <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:C.dim, padding:"9px 10px", textAlign:"center", borderBottom:`1px solid ${C.border}`, minWidth:32 }}>#</th>
                  {cols.map(c => <Th key={c.key} c={c} />)}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.playerName + i}
                    onClick={() => setSelected(p)}
                    style={{
                      cursor:"pointer",
                      background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                      transition:"background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.red}08`}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"}
                  >
                    <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, color:C.dim, padding:"10px 10px", textAlign:"center", borderBottom:`1px solid ${C.border}` }}>{i+1}</td>
                    {cols.map(c => {
                      const raw = p[c.key];
                      const val = c.fmt ? c.fmt(raw) : (raw != null ? raw : "—");
                      const isName = c.key === "playerName";
                      const isAccent = c.key === sortKey;
                      return (
                        <td key={c.key} style={{
                          padding:"10px 10px",
                          textAlign: c.left ? "left" : "center",
                          borderBottom:`1px solid ${C.border}`,
                          fontFamily: isName ? "'Noto Sans KR',sans-serif" : "'Barlow Condensed',sans-serif",
                          fontWeight: isName ? 700 : isAccent ? 800 : 500,
                          fontSize: isName ? 13 : isAccent ? 18 : 14,
                          color: isName ? C.text : isAccent ? C.red : C.muted,
                          whiteSpace:"nowrap",
                        }}>{val}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ModalDetail />
    </PageWrap>
  );
}

// ── STATS PAGE ────────────────────────────────────────────
function StatsPage() {
  const [statsTab, setStatsTab] = useState("hitter");
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = (t) => {
    setLoading(true); setError(null);
    KIA_API.fetchPlayerStats(t)
      .then(d => { setPlayers(d || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(statsTab); }, [statsTab]);

  const hitterCols = [
    { key:"playerName", label:"선수", left:true },
    { key:"hitterHra",  label:"타율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—', accent:true },
    { key:"hitterHr",   label:"홈런", accent:true },
    { key:"hitterRbi",  label:"타점" },
    { key:"hitterHit",  label:"안타" },
    { key:"hitterSb",   label:"도루" },
    { key:"hitterObp",  label:"출루율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—' },
    { key:"hitterSlg",  label:"장타율", fmt: v => v != null ? Number(v).toFixed(3).replace(/^0/,'') : '—' },
  ];

  const pitcherCols = [
    { key:"playerName",  label:"선수", left:true },
    { key:"pitcherEra",  label:"ERA",  fmt: v => v != null ? Number(v).toFixed(2) : '—', accent:true },
    { key:"pitcherWin",  label:"승",   accent:true },
    { key:"pitcherLose", label:"패" },
    { key:"pitcherSv",   label:"세이브" },
    { key:"pitcherKk",   label:"탈삼진" },
    { key:"pitcherIp",   label:"이닝" },
    { key:"pitcherWhip", label:"WHIP", fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  ];

  const cols = statsTab === "hitter" ? hitterCols : pitcherCols;
  const sortKey = statsTab === "hitter" ? "hitterHra" : "pitcherEra";
  const sorted = [...players].sort((a,b) =>
    statsTab === "hitter"
      ? Number(b[sortKey]||0) - Number(a[sortKey]||0)
      : Number(a[sortKey]||99) - Number(b[sortKey]||99)
  );

  return (
    <PageWrap>
      <SectionHead title="순위 & 통계" sub="2026 KBO 정규시즌 KIA 선수 기록" />

      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, borderRadius:10, padding:4, width:"fit-content" }}>
        {[["hitter","타자 성적"],["pitcher","투수 성적"]].map(([id,label]) => (
          <button key={id} onClick={() => setStatsTab(id)} style={{
            padding:"8px 20px", borderRadius:7, border:"none", cursor:"pointer",
            fontFamily:"'Noto Sans KR',sans-serif", fontSize:13, fontWeight:600,
            background: statsTab === id ? C.red : "transparent",
            color: statsTab === id ? "#fff" : C.muted, transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* leaderboard top 3 */}
      {!loading && !error && sorted.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
          {sorted.slice(0,3).map((p,i) => {
            const raw = p[sortKey];
            const val = cols.find(c=>c.key===sortKey)?.fmt ? cols.find(c=>c.key===sortKey).fmt(raw) : raw;
            const medals = ["🥇","🥈","🥉"];
            return (
              <Card key={p.playerName+i} style={{ padding:"20px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <span style={{ fontSize:22 }}>{medals[i]}</span>
                  <Badge color={i===0?C.gold:C.muted} small>{i+1}위</Badge>
                </div>
                <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700, fontSize:18, color:C.text, marginBottom:4 }}>{p.playerName}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:40, color: i===0?C.red:C.text, lineHeight:1 }}>{val}</div>
                <div style={{ fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, color:C.muted, marginTop:4 }}>{cols.find(c=>c.key===sortKey)?.label}</div>
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ overflow:"hidden" }}>
        {loading ? <LoadingCard rows={10} /> : error ? (
          <ErrorMsg msg={error} onRetry={() => load(statsTab)} />
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.surface }}>
                  <th style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:C.dim, padding:"9px 10px", textAlign:"center", borderBottom:`1px solid ${C.border}` }}>#</th>
                  {cols.map(c => (
                    <th key={c.key} style={{
                      fontFamily:"'Noto Sans KR',sans-serif", fontSize:11, fontWeight:700,
                      color: c.key === sortKey ? C.red : C.muted,
                      padding:"9px 12px", textAlign: c.left ? "left" : "center",
                      borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap",
                    }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.playerName+i} style={{ background: i < 3 ? `${C.red}06` : i%2===0 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                    <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:16, color: i<3?C.gold:C.dim, padding:"10px 10px", textAlign:"center", borderBottom:`1px solid ${C.border}` }}>{i+1}</td>
                    {cols.map(c => {
                      const raw = p[c.key];
                      const val = c.fmt ? c.fmt(raw) : (raw != null ? raw : "—");
                      return (
                        <td key={c.key} style={{
                          padding:"10px 12px",
                          textAlign: c.left ? "left" : "center",
                          borderBottom:`1px solid ${C.border}`,
                          fontFamily: c.left ? "'Noto Sans KR',sans-serif" : "'Barlow Condensed',sans-serif",
                          fontWeight: c.left ? 700 : c.accent ? 800 : 500,
                          fontSize: c.left ? 13 : c.accent ? 18 : 14,
                          color: c.left ? C.text : c.accent ? (i===0?C.red:C.text) : C.muted,
                          whiteSpace:"nowrap",
                        }}>{val}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}

Object.assign(window, { RosterPage, StatsPage });
