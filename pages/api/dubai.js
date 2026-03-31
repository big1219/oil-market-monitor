// pages/api/dubai.js — DEBUG v2: 여러 네이버 엔드포인트 시도

export default async function handler(req, res) {
  const results = {};
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://finance.naver.com/marketindex/",
  };

  // 시도 1: 일별시세 테이블 (HTML에 가격 직접 포함)
  try {
    const url = "https://finance.naver.com/marketindex/oilDailyQuote.naver?marketindexCd=OIL_DU&page=1";
    const resp = await fetch(url, { headers });
    const html = await resp.text();
    const prices = html.match(/\d{2,3}\.\d{2}/g);
    const dates = html.match(/\d{4}\.\d{2}\.\d{2}/g);
    const tds = html.match(/<td[^>]*>[\s\S]*?<\/td>/g);
    results.dailyQuote = {
      status: resp.status,
      length: html.length,
      prices: prices ? prices.slice(0, 15) : null,
      dates: dates ? dates.slice(0, 5) : null,
      first800: html.slice(0, 800),
      tdCount: tds ? tds.length : 0,
      firstTds: tds ? tds.slice(0, 8).map(t => t.slice(0, 100)) : null,
    };
  } catch (err) {
    results.dailyQuote = { error: err.message };
  }

  // 시도 2: 세계유가 리스트
  try {
    const url = "https://finance.naver.com/marketindex/worldOilList.naver";
    const resp = await fetch(url, { headers });
    const html = await resp.text();
    const duRegion = html.match(/OIL_DU[\s\S]{0,500}/i) || html.match(/두바이[\s\S]{0,500}/i);
    const prices = html.match(/\d{2,3}\.\d{2}/g);
    results.worldOilList = {
      status: resp.status,
      length: html.length,
      duRegion: duRegion ? duRegion[0].slice(0, 400) : null,
      prices: prices ? prices.slice(0, 15) : null,
    };
  } catch (err) {
    results.worldOilList = { error: err.message };
  }

  // 시도 3: 시장지표 메인에서 유가 섹션
  try {
    const url = "https://finance.naver.com/marketindex/";
    const resp = await fetch(url, { headers });
    const html = await resp.text();
    const oilSection = html.match(/oil[\s\S]{0,2000}/i);
    const duSection = html.match(/OIL_DU[\s\S]{0,800}/i);
    results.mainPage = {
      status: resp.status,
      length: html.length,
      oilSnippet: oilSection ? oilSection[0].slice(0, 500) : null,
      duSnippet: duSection ? duSection[0].slice(0, 500) : null,
    };
  } catch (err) {
    results.mainPage = { error: err.message };
  }

  return res.status(200).json({ debug: true, results });
}
