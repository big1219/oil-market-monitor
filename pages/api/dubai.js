// pages/api/dubai.js
// 두바이유 시세: 네이버 금융 + Investing.com 폴백 (무료)

async function tryNaverOilDetail() {
  const url = "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU";
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://finance.naver.com/marketindex/",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();

  let price = null;
  let direction = null;
  let changePercent = null;

  // 여러 패턴으로 가격 추출 시도
  const patterns = [
    /<(?:span|em)[^>]*class="[^"]*no[^"]*"[^>]*>\s*([\d,.]+)\s*<\/(?:span|em)>/,
    /no_today[\s\S]*?([\d]+\.[\d]{2})/,
    /class="blind">\s*([\d,.]+\.?\d*)\s*</,
    />\s*(\d{2,3}\.\d{2})\s*</,
    /(1[0-3]\d\.\d{2})/,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) { price = m[1].replace(/,/g, ""); break; }
  }

  if (html.includes("no_up") || html.includes("ico_up")) direction = "up";
  else if (html.includes("no_down") || html.includes("ico_down")) direction = "down";

  const pctMatch = html.match(/([\d.]+)\s*%/);
  if (pctMatch) changePercent = pctMatch[1] + "%";

  if (price) {
    return {
      price, direction, changePercent,
      source: "네이버 금융",
      sourceUrl: "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU",
    };
  }
  return null;
}

async function tryNaverMain() {
  const url = "https://finance.naver.com/marketindex/";
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();

  // OIL_DU 또는 "두바이" 근처에서 가격 추출
  const region = html.match(/OIL_DU[\s\S]{0,1000}/i) || html.match(/두바이[\s\S]{0,1000}/);
  if (!region) return null;

  const block = region[0];
  const priceMatch = block.match(/(\d{2,3}\.\d{2})/);
  if (!priceMatch) return null;

  let direction = null;
  if (block.includes("up") || block.includes("상승")) direction = "up";
  else if (block.includes("down") || block.includes("하락")) direction = "down";

  const pctMatch = block.match(/([\d.]+)%/);

  return {
    price: priceMatch[1],
    direction,
    changePercent: pctMatch ? pctMatch[1] + "%" : null,
    source: "네이버 금융",
    sourceUrl: "https://finance.naver.com/marketindex/",
  };
}

async function tryInvesting() {
  const url = "https://kr.investing.com/commodities/dubai-crude-oil-platts-futures";
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();

  const patterns = [
    /data-test="instrument-price-last"[^>]*>([\d,.]+)</,
    /"last"\s*:\s*([\d.]+)/,
    /pid-\d+-last[^>]*>([\d,.]+)</,
    /instrument-price[^>]*>([\d,.]+)</,
  ];

  let price = null;
  for (const p of patterns) {
    const m = html.match(p);
    if (m) { price = m[1].replace(/,/g, ""); break; }
  }

  if (!price) return null;

  let direction = null;
  if (html.includes("greenFont") || html.includes("isUp")) direction = "up";
  else if (html.includes("redFont") || html.includes("isDown")) direction = "down";

  const pctMatch = html.match(/data-test="instrument-price-change-percent"[^>]*>[^<]*([\d.]+)%/);

  return {
    price,
    direction,
    changePercent: pctMatch ? pctMatch[1] + "%" : null,
    source: "Investing.com",
    sourceUrl: "https://kr.investing.com/commodities/dubai-crude-oil-platts-futures",
  };
}

export default async function handler(req, res) {
  const errors = [];
  const methods = [tryNaverOilDetail, tryNaverMain, tryInvesting];
  const names = ["naver_detail", "naver_main", "investing"];

  for (let i = 0; i < methods.length; i++) {
    try {
      const result = await methods[i]();
      if (result) {
        res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
        return res.status(200).json({
          ...result,
          unit: "$/bbl",
          label: "두바이유 (현물)",
          status: "ok",
        });
      }
      errors.push({ method: names[i], msg: "no data parsed" });
    } catch (err) {
      errors.push({ method: names[i], msg: err.message });
    }
  }

  return res.status(200).json({
    status: "error",
    label: "두바이유 (현물)",
    unit: "$/bbl",
    errors,
    source: "네이버 금융",
    sourceUrl: "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU",
  });
}
