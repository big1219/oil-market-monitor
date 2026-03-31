// pages/api/dubai.js
// Naver 금융 시장지표에서 두바이유 시세 가져오기 (무료, 키 불필요)

export default async function handler(req, res) {
  try {
    // 네이버 금융 두바이유 상세 페이지
    const url = "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU";
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (!resp.ok) throw new Error(`Naver HTTP ${resp.status}`);

    const html = await resp.text();

    // 현재가 추출: <span class="no_down"> 또는 <span class="no_up"> 안의 숫자
    let price = null;
    let change = null;
    let changePercent = null;
    let direction = null; // up, down, same

    // 현재가 패턴: class="no_up" or "no_down" 안에 가격
    const priceMatch = html.match(/<span class="no_(up|down|same)">\s*([\d,.]+)\s*<\/span>/);
    if (priceMatch) {
      direction = priceMatch[1];
      price = priceMatch[2];
    }

    // 대안: <p class="no_today"> 안의 가격
    if (!price) {
      const todayMatch = html.match(/<p class="no_today">\s*<em[^>]*>([\d,.]+)<\/em>/);
      if (todayMatch) {
        price = todayMatch[1];
      }
    }

    // 대안: 첫 번째 큰 숫자 패턴 (blind_now 등)
    if (!price) {
      const blindMatch = html.match(/class="blind">([\d,.]+\.\d{2})<\/span>/);
      if (blindMatch) {
        price = blindMatch[1];
      }
    }

    // 전일대비 변동
    const changeMatch = html.match(/전일대비[\s\S]*?([\d,.]+)/);
    if (changeMatch) {
      change = changeMatch[1];
    }

    // 등락률
    const pctMatch = html.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      changePercent = pctMatch[1];
    }

    // 날짜
    const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;

    // 추가 시세 정보 (시가, 고가, 저가 등)
    const openMatch = html.match(/시가[\s\S]*?([\d,.]+\.\d{2})/);
    const highMatch = html.match(/고가[\s\S]*?([\d,.]+\.\d{2})/);
    const lowMatch = html.match(/저가[\s\S]*?([\d,.]+\.\d{2})/);

    const result = {
      price: price || null,
      direction: direction || null,
      change: change || null,
      changePercent: changePercent ? `${changePercent}%` : null,
      date: date || null,
      open: openMatch ? openMatch[1] : null,
      high: highMatch ? highMatch[1] : null,
      low: lowMatch ? lowMatch[1] : null,
      source: "네이버 금융",
      sourceUrl: "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU",
      unit: "$/bbl",
      status: price ? "ok" : "parse_error",
    };

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
    return res.status(200).json(result);
  } catch (err) {
    console.error("Dubai oil fetch error:", err.message);
    return res.status(500).json({
      status: "error",
      error: err.message,
      source: "네이버 금융",
    });
  }
}
