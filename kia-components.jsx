// KIA Tigers - Shared Components & Navigation

const { useState, useEffect, useRef } = React;

const C = {
  red:     "#E8001D",
  redDark: "#B0001A",
  redGlow: "rgba(232,0,29,0.25)",
  gold:    "#F5A623",
  bg:      "#0C0C0E",
  surface: "#141416",
  card:    "#1C1C1F",
  cardHov: "#242428",
  border:  "rgba(255,255,255,0.07)",
  text:    "#F2F2F4",
  muted:   "#8A8A90",
  dim:     "#525258",
};

// ── useFetch hook ──────────────────────────────────────────
function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetchFn()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, deps);
  return { data, loading, error, reload: () => setLoading(true) };
}

// ── Loading skeleton ───────────────────────────────────────
function Skeleton({ h = 18, w = "100%", r = 6, style }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: `linear-gradient(90deg, ${C.card} 0%, ${C.cardHov} 50%, ${C.card} 100%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s infinite linear",
      ...style,
    }} />
  );
}

function LoadingCard({ rows = 4 }) {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
      {Array(rows).fill(0).map((_, i) => (
        <Skeleton key={i} h={i === 0 ? 24 : 16} w={i === 0 ? "40%" : `${70 + Math.random() * 25}%`} />
      ))}
    </div>
  );
}

function ErrorMsg({ msg, onRetry }) {
  return (
    <div style={{
      padding: "32px 24px", textAlign: "center",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        {msg || "데이터를 불러오지 못했어요"}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>
        Vercel 배포 환경에서만 라이브 데이터가 연결됩니다
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: C.red, color: "#fff", border: "none",
          padding: "8px 20px", borderRadius: 8,
          fontFamily: "'Noto Sans KR',sans-serif", fontSize: 12, fontWeight: 700,
          cursor: "pointer",
        }}>다시 시도</button>
      )}
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────
function Nav({ page, setPage, liveGame }) {
  const pages = [
    { id: "home",     label: "홈" },
    { id: "schedule", label: "일정·결과" },
    { id: "roster",   label: "선수단" },
    { id: "stats",    label: "순위·통계" },
    { id: "live",     label: "라이브" },
    { id: "moments",  label: "득점장면" },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(12,12,14,0.92)", backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${C.border}`, height: 64,
      display: "flex", alignItems: "center",
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto", padding: "0 24px",
        display: "flex", alignItems: "center", width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40, cursor: "pointer", flexShrink: 0 }}
          onClick={() => setPage("home")}>
          <div style={{
            width: 36, height: 36, background: C.red, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff",
            boxShadow: `0 0 12px ${C.redGlow}`,
          }}>KIA</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18, color: C.text, letterSpacing: "0.5px", lineHeight: 1 }}>타이거즈</div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>KBO League 2026</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {pages.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              padding: "6px 14px", borderRadius: 6,
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: 13, fontWeight: 500,
              color: page === p.id ? C.text : C.muted,
              background: page === p.id ? C.card : "transparent",
              border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}>{p.label}</button>
          ))}
        </div>

        {/* Live indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {liveGame ? (
            <>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, animation: "livePulse 1.5s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, color: C.red, letterSpacing: "1px", cursor: "pointer" }}
                onClick={() => setPage("live")}>LIVE</span>
              <div style={{
                marginLeft: 4, padding: "4px 12px", borderRadius: 20,
                background: C.card, border: `1px solid ${C.border}`,
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: C.text,
                cursor: "pointer",
              }} onClick={() => setPage("live")}>
                {liveGame.away} <span style={{ color: C.muted }}>{liveGame.awayScore ?? "·"}</span>
                {" "}<span style={{ color: C.dim }}>vs</span>{" "}
                <span style={{ color: C.red }}>{liveGame.homeScore ?? "·"}</span> {liveGame.home}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: 11, color: C.dim }}>오늘 경기 없음</div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Reusable Card ──────────────────────────────────────────
function Card({ children, style, onClick, hover = true }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && hover && onClick ? C.cardHov : C.card,
        border: `1px solid ${C.border}`, borderRadius: 12,
        transition: "all 0.2s", cursor: onClick ? "pointer" : "default",
        ...style,
      }}>
      {children}
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────
function SectionHead({ title, sub, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, margin: 0, letterSpacing: "-0.5px" }}>{title}</h2>
        {sub && <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0", fontFamily: "'Noto Sans KR',sans-serif" }}>{sub}</p>}
      </div>
      {action && <button onClick={onAction} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontFamily: "'Noto Sans KR',sans-serif", cursor: "pointer", padding: 0 }}>{action} →</button>}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────
function Badge({ children, color = C.red, small }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: small ? "1px 7px" : "3px 10px",
      fontSize: small ? 10 : 11, fontWeight: 700,
      fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: "0.5px",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ── Countdown ─────────────────────────────────────────────
function Countdown({ targetDatetime }) {
  const [t, setT] = useState({ d:0, h:0, m:0, s:0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDatetime) - new Date();
      if (diff <= 0) return;
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDatetime]);

  const box = (val, label) => (
    <div style={{ textAlign: "center", minWidth: 52 }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 42, color: C.text, lineHeight: 1, letterSpacing: "-1px" }}>{String(val).padStart(2, "0")}</div>
      <div style={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
  const sep = () => <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 36, color: C.dim, paddingBottom: 8, lineHeight: 1 }}>:</div>;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      {box(t.d, "일")} {sep()} {box(t.h, "시간")} {sep()} {box(t.m, "분")} {sep()} {box(t.s, "초")}
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────
function PageWrap({ children }) {
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "88px 24px 60px", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {children}
    </div>
  );
}

// ── Team logo chip ─────────────────────────────────────────
function TeamLogo({ team, size = 32 }) {
  const isKIA = team === "KIA";
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: isKIA ? C.red : C.surface,
      border: `1px solid ${isKIA ? C.red : C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
      fontSize: Math.round(size * 0.34), color: "#fff", flexShrink: 0,
      boxShadow: isKIA ? `0 0 8px ${C.redGlow}` : "none",
    }}>{TEAM_LOGO[team] || team?.slice(0,2)}</div>
  );
}

Object.assign(window, {
  C, useFetch, Skeleton, LoadingCard, ErrorMsg,
  Nav, Card, SectionHead, Badge, Countdown, PageWrap, TeamLogo,
});
