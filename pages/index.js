import { useState, useCallback, useEffect, useRef } from "react";
import Head from "next/head";

// ─── CONFIG ─────────────────────────────────
const PRICE_CARDS = [
  { id: "dubai", icon: "🛢️", category: "crude", highlight: true, isDubai: true },
  { id: "wti", icon: "🇺🇸", category: "crude", highlight: true },
  { id: "brent", icon: "🇬🇧", category: "crude", highlight: true },
  { id: "usdkrw", icon: "💱", category: "fx", highlight: true },
  { id: "heating_oil", icon: "⛽", category: "product" },
  { id: "natural_gas", icon: "🔥", category: "product" },
  { id: "dxy", icon: "💵", category: "fx" },
];

const REFERENCE_CARDS = [
  {
    id: "mops",
    icon: "🏭",
    label: "MOPS Gasoil / Fuel Oil",
    desc: "S&P Global Platts 유료 데이터 (Heating Oil로 추세 참고)",
    link: "https://www.spglobal.com/commodityinsights/en",
    linkText: "S&P Global 바로가기",
    category: "product",
  },
  {
    id: "baseoil",
    icon: "🫧",
    label: "베이스오일 (Group II)",
    desc: "ICIS 유료 데이터",
    link: "https://www.icis.com/explore/commodities/chemicals/base-oils/",
    linkText: "ICIS 바로가기",
    category: "material",
  },
  {
    id: "additive",
    icon: "⚗️",
    label: "첨가제 가격 동향",
    desc: "Lubrizol, Infineum, Afton 등 업체별 개별 고시",
    link: "https://www.lubrizol.com/",
    linkText: "Lubrizol 바로가기",
    category: "material",
  },
];

const CAT_COLORS = {
  crude: "#ff6b35",
  fx: "#4ecdc4",
  product: "#ffe66d",
  material: "#a78bfa",
};

const CAT_LABELS = {
  crude: "원유 시세",
  fx: "환율 & 달러",
  product: "정유제품",
  material: "베이스오일 & 첨가제",
};

// ─── COMPONENTS ─────────────────────────────
function PriceCard({ config, data, catColor }) {
  if (!data) return null;
  const isError = data.status === "error";
  const price = data.price;
  const isUp = data.change && (data.change.startsWith("+") && data.change !== "+0.00%");
  const isDown = data.change && data.change.startsWith("-");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${isError ? "#2a1515" : catColor + "25"}`,
        borderRadius: 14,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s",
        minHeight: 120,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: isError ? "transparent" : catColor,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17 }}>{config.icon}</span>
          <span style={{ fontSize: 12.5, color: "#999", fontWeight: 500 }}>
            {data.label || config.id}
          </span>
        </div>
        {data.source && (
          data.sourceUrl ? (
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9.5, color: "#4ecdc4", fontFamily: "'IBM Plex Mono', monospace", textDecoration: "none" }}>
              {data.source} ↗
            </a>
          ) : (
            <span style={{ fontSize: 9.5, color: "#444", fontFamily: "'IBM Plex Mono', monospace" }}>
              {data.source}
            </span>
          )
        )}
      </div>

      {isError ? (
        <div style={{ fontSize: 12, color: "#ff4444" }}>데이터 없음</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: config.highlight ? 30 : 26,
                fontWeight: 700,
                color: "#f5f5f5",
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {typeof price === "number"
                ? config.id === "usdkrw"
                  ? price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : price}
            </span>
            {data.unit && (
              <span style={{ fontSize: 12, color: "#666" }}>{data.unit}</span>
            )}
          </div>
          {data.change && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                background: isUp ? "rgba(255,68,68,0.12)" : isDown ? "rgba(78,205,196,0.12)" : "rgba(255,255,255,0.05)",
                color: isUp ? "#ff6b6b" : isDown ? "#4ecdc4" : "#888",
              }}
            >
              {isUp ? "▲" : isDown ? "▼" : ""} {data.change}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function ReferenceCard({ item, catColor }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid #151525",
        borderRadius: 14,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        minHeight: 120,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: catColor + "40",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 17 }}>{item.icon}</span>
        <span style={{ fontSize: 12.5, color: "#999", fontWeight: 500 }}>{item.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 10 }}>
        {item.desc}
      </div>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11.5,
          color: catColor,
          textDecoration: "none",
          fontWeight: 500,
          opacity: 0.8,
        }}
      >
        ↗ {item.linkText}
      </a>
    </div>
  );
}

function NewsItem({ item, index }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        padding: "13px 16px",
        borderBottom: "1px solid #111120",
        textDecoration: "none",
        transition: "background 0.2s",
        animation: `fadeUp 0.3s ease ${index * 50}ms both`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.6, marginBottom: 4 }}>
        {item.title}
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "#555", fontFamily: "'IBM Plex Mono', monospace" }}>
        {item.source && <span>{item.source}</span>}
        {item.timeAgo && <span>{item.timeAgo}</span>}
      </div>
    </a>
  );
}

// ─── MAIN PAGE ──────────────────────────────
export default function Dashboard() {
  const [priceData, setPriceData] = useState(null);
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pricesResp, newsResp, dubaiResp] = await Promise.all([
        fetch("/api/prices"),
        fetch("/api/news"),
        fetch("/api/dubai"),
      ]);

      const priceObj = {};

      if (pricesResp.ok) {
        const prices = await pricesResp.json();
        Object.assign(priceObj, prices.data);
      } else {
        setError("가격 데이터를 가져오지 못했습니다");
      }

      // Dubai data from Naver
      if (dubaiResp.ok) {
        const dubai = await dubaiResp.json();
        if (dubai.status === "ok" && dubai.price) {
          const changeStr = dubai.direction === "up"
            ? `+${dubai.changePercent || dubai.change || ""}`
            : dubai.direction === "down"
            ? `-${dubai.changePercent || dubai.change || ""}`
            : dubai.changePercent || "";
          priceObj.dubai = {
            price: parseFloat(dubai.price.replace(/,/g, "")) || dubai.price,
            change: changeStr,
            label: "두바이유 (현물)",
            unit: "$/bbl",
            source: "네이버 금융",
            sourceUrl: dubai.sourceUrl,
            date: dubai.date,
            status: "ok",
          };
        } else {
          priceObj.dubai = {
            label: "두바이유 (현물)",
            unit: "$/bbl",
            status: "error",
            error: "네이버 파싱 실패",
          };
        }
      }

      setPriceData(priceObj);

      if (newsResp.ok) {
        const news = await newsResp.json();
        setNewsData(news.news);
      }

      setLastUpdate(new Date());
    } catch (err) {
      setError("네트워크 오류: " + err.message);
    }

    setLoading(false);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAll, 5 * 60 * 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchAll]);

  // Group cards by category
  const categories = ["crude", "fx", "product", "material"];

  return (
    <>
      <Head>
        <title>원자재 시황 모니터</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛢️</text></svg>" />
      </Head>

      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,107,53,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.02) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "gridPulse 5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #ff6b35, #ff4444)",
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
                <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.04em" }}>
                  원자재 시황 모니터
                </h1>
                <p style={{ fontSize: 11, color: "#555", fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>
                  WTI · Brent · Dubai · FX · Products · Free API (무료)
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
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
                5분 자동갱신
              </label>
              <button
                onClick={fetchAll}
                disabled={loading}
                style={{
                  padding: "10px 22px",
                  background: loading ? "#151525" : "linear-gradient(135deg, #ff6b35, #e8501a)",
                  color: loading ? "#555" : "#fff",
                  border: loading ? "1px solid #252540" : "none",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(255,107,53,0.3)",
                }}
              >
                {loading ? "⏳ 로딩..." : "🔄 새로고침"}
              </button>
            </div>
            {lastUpdate && (
              <span style={{ fontSize: 10.5, color: "#444", fontFamily: "'IBM Plex Mono', monospace" }}>
                {lastUpdate.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </header>

        {/* Loading bar */}
        {loading && (
          <div style={{ height: 3, background: "#151525", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: "60%",
                background: "linear-gradient(90deg, #ff6b35, #ffe66d)",
                borderRadius: 2,
                animation: "shimmer 1.2s infinite",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(255,50,50,0.08)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: "#ff7777",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Alert banner */}
        <div
          style={{
            background: "rgba(255,50,50,0.06)",
            border: "1px solid rgba(255,68,68,0.15)",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1.6 }}>⚠️</span>
          <div style={{ fontSize: 12.5, color: "#dd8888", lineHeight: 1.7 }}>
            <strong style={{ color: "#ff7777" }}>호르무즈 해협 위기 지속</strong>
            &nbsp;— 이란 분쟁으로 글로벌 원유 공급 ~20% 차단 위험.
            두바이 현물 프리미엄이 선물 대비 급등. 윤활유 원자재 가격 연쇄 인상 주의.
          </div>
        </div>

        {/* ── PRICE CARDS ── */}
        {categories.map((cat) => {
          const priceItems = PRICE_CARDS.filter((c) => c.category === cat);
          const refItems = REFERENCE_CARDS.filter((c) => c.category === cat);
          if (priceItems.length === 0 && refItems.length === 0) return null;

          return (
            <section key={cat} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: CAT_COLORS[cat] }} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: CAT_COLORS[cat] }}>
                  {CAT_LABELS[cat]}
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {priceItems.map((cfg) => (
                  <PriceCard
                    key={cfg.id}
                    config={cfg}
                    data={priceData?.[cfg.id]}
                    catColor={CAT_COLORS[cat]}
                  />
                ))}
                {refItems.map((item) => (
                  <ReferenceCard key={item.id} item={item} catColor={CAT_COLORS[cat]} />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── NEWS ── */}
        <section style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: "#ff6b6b" }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#ff6b6b" }}>
              📰 유가 & 에너지 뉴스
            </h2>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid #151525",
              borderRadius: 14,
              overflow: "hidden",
              minHeight: 80,
            }}
          >
            {!newsData && !loading && (
              <div style={{ padding: 24, textAlign: "center", color: "#333", fontSize: 13 }}>
                뉴스를 불러오는 중...
              </div>
            )}
            {newsData &&
              newsData.length > 0 &&
              newsData.map((item, i) => <NewsItem key={i} item={item} index={i} />)}
            {newsData && newsData.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>
                뉴스를 찾을 수 없습니다
              </div>
            )}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <div
          style={{
            marginTop: 36,
            padding: "14px 18px",
            background: "rgba(255,255,255,0.015)",
            borderRadius: 10,
            border: "1px solid #111120",
          }}
        >
          <div style={{ fontSize: 11, color: "#444", lineHeight: 1.9, fontFamily: "'IBM Plex Mono', monospace" }}>
            <strong style={{ color: "#666" }}>📌 데이터 출처</strong>
            <br />
            • WTI, 브렌트, 난방유, 천연가스, 달러인덱스: Yahoo Finance (무료, 실시간)
            <br />
            • 두바이유 (현물): 네이버 금융 시장지표 (무료)
            <br />
            • 환율 USD/KRW: Yahoo Finance + open.er-api.com (무료 백업)
            <br />
            • 뉴스: Google News RSS (무료)
            <br />
            • 두바이유 현물, MOPS, 베이스오일, 첨가제: 유료 데이터 (Platts, ICIS) — 링크 제공
            <br />
            • 💰 이 대시보드는 <strong style={{ color: "#4ecdc4" }}>100% 무료</strong>로 운영됩니다 (API 비용 없음)
          </div>
        </div>

        <footer style={{ marginTop: 16, textAlign: "center", fontSize: 10, color: "#222", fontFamily: "'IBM Plex Mono', monospace" }}>
          Oil Market Monitor v2.0 · Free API Edition
        </footer>
      </div>
    </>
  );
}
