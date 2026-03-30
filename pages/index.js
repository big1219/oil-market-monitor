import { useState, useCallback, useEffect } from "react";
import Head from "next/head";

// ──────────────────────────────────────────────
// INDICATOR CONFIG
// ──────────────────────────────────────────────
const INDICATORS = [
  {
    id: "dubai",
    label: "두바이유 (현물)",
    unit: "$/bbl",
    query: "Dubai crude oil spot price today per barrel",
    icon: "🛢️",
    category: "crude",
  },
  {
    id: "wti",
    label: "WTI 원유",
    unit: "$/bbl",
    query: "WTI crude oil price today per barrel NYMEX",
    icon: "🇺🇸",
    category: "crude",
  },
  {
    id: "brent",
    label: "브렌트유",
    unit: "$/bbl",
    query: "Brent crude oil price today per barrel ICE",
    icon: "🇬🇧",
    category: "crude",
  },
  {
    id: "usdkrw",
    label: "환율 (USD/KRW)",
    unit: "₩",
    query: "USD KRW exchange rate today won per dollar",
    icon: "💱",
    category: "fx",
  },
  {
    id: "mops_gasoil",
    label: "MOPS Gasoil (10ppm)",
    unit: "$/bbl",
    query: "MOPS Singapore gasoil 10ppm price today per barrel Platts 2026",
    icon: "⛽",
    category: "mops",
  },
  {
    id: "mops_fo",
    label: "MOPS Fuel Oil 380",
    unit: "$/MT",
    query: "MOPS Singapore fuel oil 380cst price today per metric ton 2026",
    icon: "🏭",
    category: "mops",
  },
  {
    id: "base_oil",
    label: "베이스오일 (Group II)",
    unit: "$/MT",
    query: "Group II base oil price Asia 2026 per metric ton spot",
    icon: "🫧",
    category: "material",
  },
  {
    id: "additive",
    label: "첨가제 동향",
    unit: "",
    query: "lubricant additive price increase announcement 2026 Lubrizol Infineum Afton Chemical latest",
    icon: "⚗️",
    category: "material",
  },
];

const CATEGORIES = [
  { key: "crude", label: "원유 시세", color: "#ff6b35", desc: "중동·미국·북해 벤치마크" },
  { key: "fx", label: "환율", color: "#4ecdc4", desc: "USD/KRW" },
  { key: "mops", label: "MOPS 정유제품", color: "#ffe66d", desc: "싱가포르 기준 아시아 벤치마크" },
  { key: "material", label: "원자재 & 첨가제", color: "#a78bfa", desc: "베이스오일·첨가제 패키지" },
];

const PRICE_SYSTEM_PROMPT = `You are a commodities market data extractor. Given web search results, extract the most recent price data.
Respond ONLY in this exact JSON format with no markdown, no backticks, no extra text:
{"price":"123.45","change":"+2.5%","summary":"한국어로 1-2문장 시장 상황 요약"}

Rules:
- price: number only with decimal. For exchange rates use format like "1,508.20". For items with no specific spot price, use empty string "".
- change: include + or - sign and %. If unavailable, use "".
- summary: Always in Korean, 1-2 sentences about current market situation.
- If data is about trend/news (no specific price), set price="" and write detailed summary.`;

const NEWS_SYSTEM_PROMPT = `You are a Korean-language news analyst for the lubricant oil industry. Search for the latest news and produce a summary.
Respond ONLY in this exact JSON array format with no markdown, no backticks:
[{"text":"뉴스 내용 한국어 1문장","source":"출처","severity":"high"},{"text":"뉴스 내용","source":"출처","severity":"medium"}]

Rules:
- Provide exactly 6 news items
- severity: "high" for supply disruption/price spike, "medium" for policy/forecast, "low" for general
- Focus on: Middle East oil crisis, Hormuz strait, crude supply, lubricant raw material prices, Korean energy market impact
- All text in Korean`;

// ──────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    idle: { bg: "#1a1a2e", color: "#555", text: "대기" },
    loading: { bg: "#332b00", color: "#ffe66d", text: "검색중" },
    done: { bg: "#0a2922", color: "#4ecdc4", text: "완료" },
    error: { bg: "#2a0a0a", color: "#ff4444", text: "오류" },
  };
  const c = config[status] || config.idle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.color,
          animation: status === "loading" ? "pulse 1s infinite" : "none",
        }}
      />
      {c.text}
    </span>
  );
}

function IndicatorCard({ indicator, data, status, catColor, delay }) {
  const isUp =
    data?.change?.includes("+") ||
    data?.change?.includes("상승") ||
    (data?.change && !data?.change?.includes("-") && parseFloat(data?.change) > 0);
  const isDown = data?.change?.includes("-") || data?.change?.includes("하락");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${status === "done" ? catColor + "30" : "#151525"}`,
        borderRadius: 14,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.4s ease",
        animation: status === "done" ? `fadeUp 0.5s ease ${delay}ms both` : "none",
        minHeight: 140,
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: status === "done" ? catColor : "transparent",
          transition: "background 0.6s",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{indicator.icon}</span>
          <span
            style={{
              fontSize: 12.5,
              color: "#999",
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            {indicator.label}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Content */}
      {status === "loading" && (
        <div
          style={{
            height: 36,
            borderRadius: 6,
            background:
              "linear-gradient(90deg, #151525 25%, #1f1f35 50%, #151525 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            marginBottom: 8,
          }}
        />
      )}

      {status === "done" && data && (
        <>
          {data.price && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#f5f5f5",
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                {data.price}
              </span>
              {indicator.unit && (
                <span style={{ fontSize: 12, color: "#666", fontWeight: 400 }}>
                  {indicator.unit}
                </span>
              )}
            </div>
          )}
          {data.change && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                background: isUp
                  ? "rgba(255,68,68,0.12)"
                  : isDown
                  ? "rgba(78,205,196,0.12)"
                  : "rgba(255,255,255,0.05)",
                color: isUp ? "#ff6b6b" : isDown ? "#4ecdc4" : "#888",
                marginBottom: 10,
              }}
            >
              {isUp ? "▲" : isDown ? "▼" : ""}
              {data.change}
            </div>
          )}
          {data.summary && (
            <div
              style={{
                fontSize: 12,
                color: "#777",
                lineHeight: 1.7,
                marginTop: 6,
              }}
            >
              {data.summary}
            </div>
          )}
        </>
      )}

      {status === "idle" && (
        <div
          style={{
            color: "#333",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            paddingTop: 8,
          }}
        >
          —
        </div>
      )}

      {status === "error" && (
        <div style={{ color: "#ff4444", fontSize: 12, paddingTop: 8 }}>
          데이터를 가져오지 못했습니다
        </div>
      )}
    </div>
  );
}

function NewsCard({ item, index }) {
  const severityConfig = {
    high: { border: "#ff4444", bg: "rgba(255,68,68,0.06)", icon: "🔴" },
    medium: { border: "#ffe66d", bg: "rgba(255,230,109,0.04)", icon: "🟡" },
    low: { border: "#4ecdc4", bg: "rgba(78,205,196,0.04)", icon: "🟢" },
  };
  const s = severityConfig[item.severity] || severityConfig.medium;

  return (
    <div
      style={{
        padding: "14px 18px",
        borderLeft: `3px solid ${s.border}`,
        background: s.bg,
        borderRadius: "0 8px 8px 0",
        marginBottom: 8,
        animation: `fadeUp 0.4s ease ${index * 80}ms both`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#ddd",
          lineHeight: 1.7,
          display: "flex",
          gap: 8,
        }}
      >
        <span style={{ flexShrink: 0 }}>{s.icon}</span>
        <span>{item.text}</span>
      </div>
      {item.source && (
        <div
          style={{
            fontSize: 10,
            color: "#555",
            marginTop: 4,
            paddingLeft: 22,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {item.source}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────
export default function Dashboard() {
  const [statuses, setStatuses] = useState({});
  const [results, setResults] = useState({});
  const [newsItems, setNewsItems] = useState([]);
  const [newsStatus, setNewsStatus] = useState("idle");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchOne = useCallback(async (indicator) => {
    setStatuses((prev) => ({ ...prev, [indicator.id]: "loading" }));

    try {
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "indicator",
          systemPrompt: PRICE_SYSTEM_PROMPT,
          query: `Search for the latest data: ${indicator.query}. Today is ${today}. Extract the most recent price/rate and change from previous session.`,
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const { text } = await resp.json();

      if (text) {
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          setResults((prev) => ({ ...prev, [indicator.id]: parsed }));
          setStatuses((prev) => ({ ...prev, [indicator.id]: "done" }));
        } catch {
          setResults((prev) => ({
            ...prev,
            [indicator.id]: { price: "", change: "", summary: text.slice(0, 250) },
          }));
          setStatuses((prev) => ({ ...prev, [indicator.id]: "done" }));
        }
      } else {
        setStatuses((prev) => ({ ...prev, [indicator.id]: "error" }));
      }
    } catch (err) {
      console.error(`Error fetching ${indicator.id}:`, err);
      setStatuses((prev) => ({ ...prev, [indicator.id]: "error" }));
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setNewsStatus("loading");
    try {
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "news",
          systemPrompt: NEWS_SYSTEM_PROMPT,
          query: `Find the latest breaking news as of ${today} about: Middle East oil crisis, Iran Hormuz strait disruption, crude oil supply shortage, lubricant base oil and additive price changes, Korean energy market impact. Focus on what matters most to Korean lubricant oil manufacturers.`,
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const { text } = await resp.json();
      if (text) {
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          setNewsItems(Array.isArray(parsed) ? parsed : []);
          setNewsStatus("done");
        } catch {
          setNewsItems([{ text: text.slice(0, 400), source: "", severity: "medium" }]);
          setNewsStatus("done");
        }
      } else {
        setNewsStatus("error");
      }
    } catch {
      setNewsStatus("error");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress({ current: 0, total: INDICATORS.length + 1 });

    for (let i = 0; i < INDICATORS.length; i++) {
      await fetchOne(INDICATORS[i]);
      setProgress({ current: i + 1, total: INDICATORS.length + 1 });
      await new Promise((r) => setTimeout(r, 600));
    }

    await fetchNews();
    setProgress({ current: INDICATORS.length + 1, total: INDICATORS.length + 1 });
    setLastUpdate(new Date());
    setIsRunning(false);
  }, [fetchOne, fetchNews, isRunning]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAll();
    }, 10 * 60 * 1000); // 10분
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAll]);

  const progressPct =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      <Head>
        <title>원자재 시황 모니터 | Oil Market Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="실시간 원유·환율·MOPS·첨가제 가격 모니터링 대시보드" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛢️</text></svg>" />
      </Head>

      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,107,53,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.02) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "gridPulse 5s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* ── HEADER ── */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #ff6b35 0%, #ff4444 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 19,
                  boxShadow: "0 4px 20px rgba(255,107,53,0.25)",
                }}
              >
                🛢️
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 21,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.2,
                  }}
                >
                  원자재 시황 모니터
                </h1>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "#555",
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginTop: 2,
                  }}
                >
                  Dubai · WTI · Brent · FX · MOPS · Base Oil · Additives
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Auto-refresh toggle */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#666",
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ accentColor: "#ff6b35" }}
                />
                10분 자동갱신
              </label>

              <button
                onClick={fetchAll}
                disabled={isRunning}
                style={{
                  padding: "10px 24px",
                  background: isRunning
                    ? "#151525"
                    : "linear-gradient(135deg, #ff6b35 0%, #e8501a 100%)",
                  color: isRunning ? "#555" : "#fff",
                  border: isRunning ? "1px solid #252540" : "none",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: isRunning ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  letterSpacing: "-0.01em",
                  boxShadow: isRunning ? "none" : "0 4px 16px rgba(255,107,53,0.3)",
                }}
              >
                {isRunning ? `⏳ ${progress.current}/${progress.total}` : "🔄 최신 시세 조회"}
              </button>
            </div>
            {lastUpdate && (
              <span
                style={{
                  fontSize: 10.5,
                  color: "#444",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                마지막 업데이트{" "}
                {lastUpdate.toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </header>

        {/* Progress bar */}
        {isRunning && (
          <div
            style={{
              height: 3,
              background: "#151525",
              borderRadius: 2,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #ff6b35, #ffe66d)",
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        )}

        {/* ── ALERT BANNER ── */}
        <div
          style={{
            background: "rgba(255,50,50,0.06)",
            border: "1px solid rgba(255,68,68,0.18)",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1.6 }}>⚠️</span>
          <div style={{ fontSize: 12.5, color: "#dd8888", lineHeight: 1.7 }}>
            <strong style={{ color: "#ff7777" }}>호르무즈 해협 위기 지속</strong>
            &nbsp;— 이란 분쟁으로 글로벌 원유 공급 ~20% 차단 위험. 두바이 현물
            프리미엄이 선물 대비 급등. 4월 중순 이후 SPR 방출분 소진 시 공급 절벽
            가능성. 윤활유 원자재(베이스오일·첨가제) 가격 연쇄 인상 주의.
          </div>
        </div>

        {/* ── INDICATOR GRID ── */}
        {CATEGORIES.map((cat) => {
          const items = INDICATORS.filter((i) => i.category === cat.key);
          if (items.length === 0) return null;
          return (
            <section key={cat.key} style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 2,
                    background: cat.color,
                  }}
                />
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: cat.color,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {cat.label}
                </h2>
                <span style={{ fontSize: 11, color: "#444" }}>{cat.desc}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                  gap: 12,
                }}
              >
                {items.map((ind, idx) => (
                  <IndicatorCard
                    key={ind.id}
                    indicator={ind}
                    data={results[ind.id]}
                    status={statuses[ind.id] || "idle"}
                    catColor={cat.color}
                    delay={idx * 80}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── NEWS ── */}
        <section style={{ marginTop: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                borderRadius: 2,
                background: "#ff6b6b",
              }}
            />
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#ff6b6b",
                letterSpacing: "-0.02em",
              }}
            >
              📰 주요 뉴스 & 리스크 알림
            </h2>
            <StatusBadge status={newsStatus} />
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid #151525",
              borderRadius: 14,
              padding: "16px 18px",
              minHeight: 100,
            }}
          >
            {newsStatus === "idle" && (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#333",
                  fontSize: 13,
                }}
              >
                🔄 상단 버튼을 눌러 최신 데이터를 가져오세요
              </div>
            )}
            {newsStatus === "loading" && (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#ffe66d",
                  fontSize: 13,
                }}
              >
                뉴스 검색 중...
              </div>
            )}
            {newsStatus === "done" &&
              newsItems.map((item, i) => (
                <NewsCard key={i} item={item} index={i} />
              ))}
            {newsStatus === "error" && (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#ff4444",
                  fontSize: 13,
                }}
              >
                뉴스를 가져오지 못했습니다
              </div>
            )}
          </div>
        </section>

        {/* ── DATA SOURCE NOTICE ── */}
        <div
          style={{
            marginTop: 36,
            padding: "16px 20px",
            background: "rgba(255,255,255,0.015)",
            borderRadius: 12,
            border: "1px solid #151525",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#444",
              lineHeight: 1.9,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <strong style={{ color: "#666" }}>📌 데이터 출처 및 유의사항</strong>
            <br />
            • 원유: CME Group, ICE, Investing.com 등 공개 시장데이터 기반
            <br />
            • 환율: 한국은행, TradingEconomics 공시 기준
            <br />
            • MOPS: S&P Global Platts 발표 기준 (유료 — 뉴스 인용 범위 내 제공)
            <br />
            • 베이스오일/첨가제: ICIS, 업계 공시 기반 (실시간 시세 불가 — 동향 정보)
            <br />
            • 데이터는 AI 웹검색 기반이며 거래 의사결정용이 아닙니다
            <br />• Platts/ICIS 구독 시 정확한 실시간 데이터 연동 가능
          </div>
        </div>

        <footer
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 10.5,
            color: "#2a2a3e",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Oil Market Monitor · Powered by Claude API + Web Search · Internal Use
        </footer>
      </div>
    </>
  );
}
