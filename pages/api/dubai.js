// pages/api/dubai.js
// 두바이유 시세: 네이버 금융 worldOilDetail (무료, 키 불필요)
// 가격은 개별 숫자 span으로 인코딩됨: <span class="no1">1</span> = 숫자 1, <span class="jum">.</span> = 소수점

export default async function handler(req, res) {
  try {
    const url =
      "https://finance.naver.com/marketindex/worldOilDetail.naver?marketindexCd=OIL_DU&fdtc=2";
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: "https://finance.naver.com/marketindex/",
      },
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    // ── 1. 현재가 추출 ──
    // no_today 영역에서 개별 숫자 span 파싱
    const todayBlock = html.match(/no_today[\s\S]*?<\/em>/);
    let price = null;

    if (todayBlock) {
      const spans = todayBlock[0].match(/<span class="(no\d|jum)">[^<]*<\/span>/g);
      if (spans) {
        price = spans
          .map((s) => {
            if (s.includes("jum")) return ".";
            const digitMatch = s.match(/class="no(\d)"/);
            return digitMatch ? digitMatch[1] : "";
          })
          .join("");
      }
    }

    if (!price || price === "." || price.length < 3) {
      return res.status(200).json({
        status: "error",
        label: "두바이유 (현물)",
        unit: "$/bbl",
        error: "price parse failed",
        source: "네이버 금융",
        sourceUrl: url,
      });
    }

    // ── 2. 등락 방향 ──
    let direction = null;
    if (html.includes("no_up") || html.includes("point_up") || html.includes("ico up")) {
      direction = "up";
    } else if (html.includes("no_down") || html.includes("point_down") || html.includes("ico down")) {
      direction = "down";
    }

    // ── 3. 전일대비 변동폭 ──
    // no_exday 영역에서 변동폭 파싱 (같은 span 구조)
    const exdayBlock = html.match(/no_exday[\s\S]*?<\/p>/);
    let change = null;

    if (exdayBlock) {
      // 첫 번째 em 안의 숫자 spans (변동폭)
      const emBlock = exdayBlock[0].match(/<em[^>]*>[\s\S]*?<\/em>/g);
      if (emBlock) {
        // 변동폭 (첫 번째 em 중 ico 뒤에 오는 숫자들)
        for (const em of emBlock) {
          const spans = em.match(/<span class="(no\d|jum)">[^<]*<\/span>/g);
          if (spans && spans.length > 0) {
            const val = spans
              .map((s) => {
                if (s.includes("jum")) return ".";
                const d = s.match(/class="no(\d)"/);
                return d ? d[1] : "";
              })
              .join("");
            if (val && val !== "." && !change) {
              change = val;
            }
          }
        }
      }
    }

    // ── 4. 등락률 ──
    let changePercent = null;
    // 퍼센트는 보통 마지막 em에 있음
    const pctMatch = html.match(/no_exday[\s\S]*?([\d.]+)\s*%/);
    if (pctMatch) {
      changePercent = pctMatch[1] + "%";
    } else if (change && price) {
      // 직접 계산
      const p = parseFloat(price);
      const c = parseFloat(change);
      if (p > 0 && c > 0) {
        const pct = ((c / (p - c)) * 100).toFixed(2);
        changePercent = pct + "%";
      }
    }

    // ── 5. 날짜 ──
    const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;

    // ── 응답 ──
    const changeStr =
      direction === "up"
        ? `+${changePercent || change || ""}`
        : direction === "down"
        ? `-${changePercent || change || ""}`
        : changePercent || "";

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
    return res.status(200).json({
      price,
      change: changeStr,
      direction,
      changeAmount: change,
      changePercent,
      date,
      label: "두바이유 (현물)",
      unit: "$/bbl",
      source: "네이버 금융",
      sourceUrl:
        "https://finance.naver.com/marketindex/worldOilDetail.naver?marketindexCd=OIL_DU&fdtc=2",
      status: "ok",
    });
  } catch (err) {
    console.error("Dubai API error:", err.message);
    return res.status(200).json({
      status: "error",
      label: "두바이유 (현물)",
      unit: "$/bbl",
      error: err.message,
      source: "네이버 금융",
      sourceUrl:
        "https://finance.naver.com/marketindex/worldOilDetail.naver?marketindexCd=OIL_DU&fdtc=2",
    });
  }
}
