// pages/api/prices.js
// Free data: Yahoo Finance (no API key needed) + open.er-api.com

const YAHOO_SYMBOLS = [
  { id: "wti", symbol: "CL=F", label: "WTI 원유", unit: "$/bbl" },
  { id: "brent", symbol: "BZ=F", label: "브렌트유", unit: "$/bbl" },
  { id: "heating_oil", symbol: "HO=F", label: "난방유 (Gasoil 참고)", unit: "$/gal" },
  { id: "natural_gas", symbol: "NG=F", label: "천연가스", unit: "$/MMBtu" },
  { id: "usdkrw", symbol: "KRW=X", label: "USD/KRW", unit: "₩" },
  { id: "dxy", symbol: "DX-Y.NYB", label: "달러 인덱스", unit: "" },
];

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("No data");

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  let change = null;
  if (prevClose && prevClose > 0) {
    change = (((price - prevClose) / prevClose) * 100).toFixed(2);
  }

  return {
    price,
    previousClose: prevClose,
    change: change !== null ? (parseFloat(change) >= 0 ? `+${change}%` : `${change}%`) : null,
    timestamp: meta.regularMarketTime,
  };
}

async function fetchExchangeRate() {
  try {
    const resp = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { krw: data.rates?.KRW, time: data.time_last_update_utc };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const results = {};

  // Fetch all Yahoo symbols in parallel
  const promises = YAHOO_SYMBOLS.map(async ({ id, symbol, label, unit }) => {
    try {
      const data = await fetchYahoo(symbol);
      results[id] = { ...data, label, unit, source: "Yahoo Finance", status: "ok" };
    } catch (err) {
      results[id] = { label, unit, error: err.message, status: "error" };
    }
  });

  // Also fetch exchange rate backup
  const fxPromise = fetchExchangeRate().then((fx) => {
    if (fx?.krw) {
      results.usdkrw_backup = {
        price: fx.krw,
        source: "open.er-api.com",
        time: fx.time,
      };
    }
  });

  await Promise.all([...promises, fxPromise]);

  // If Yahoo KRW failed, use backup
  if (results.usdkrw?.status === "error" && results.usdkrw_backup) {
    results.usdkrw = {
      price: results.usdkrw_backup.price,
      change: null,
      label: "USD/KRW",
      unit: "₩",
      source: "open.er-api.com",
      status: "ok",
    };
  }

  // Cache for 3 minutes
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
  return res.status(200).json({
    data: results,
    fetchedAt: new Date().toISOString(),
  });
}
