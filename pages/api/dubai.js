// pages/api/dubai.js — DEBUG v3

export default async function handler(req, res) {
  const results = {};
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://finance.naver.com/marketindex/",
  };

  // 1: 메인페이지에서 oilGoldList 전체 섹션 추출
  try {
    const resp = await fetch("https://finance.naver.com/marketindex/", { headers });
    const html = await resp.text();
    const oilSection = html.match(/oilGoldList[\s\S]{0,5000}?<\/ul>/);
    // 모든 li 항목 추출
    const lis = oilSection ? oilSection[0].match(/<li[\s\S]*?<\/li>/g) : null;
    // 모든 value span 추출
    const values = oilSection ? oilSection[0].match(/<span class="value">[^<]+<\/span>/g) : null;
    // 모든 href 추출
    const hrefs = oilSection ? oilSection[0].match(/href="[^"]+"/g) : null;
    // 모든 blind span (이름)
    const names = oilSection ? oilSection[0].match(/<span class="blind">[^<]+<\/span>/g) : null;

    results.mainOilList = {
      sectionLength: oilSection ? oilSection[0].length : 0,
      liCount: lis ? lis.length : 0,
      values,
      hrefs,
      names,
      rawSection: oilSection ? oilSection[0].slice(0, 2000) : null,
    };
  } catch (err) {
    results.mainOilList = { error: err.message };
  }

  // 2: worldOilDetail 두바이유 페이지
  try {
    const resp = await fetch("https://finance.naver.com/marketindex/worldOilDetail.naver?marketindexCd=OIL_DU&fdtc=2", { headers });
    const html = await resp.text();
    const prices = html.match(/\d{2,3}\.\d{2}/g);
    const values = html.match(/<span class="value">[^<]+<\/span>/g);
    const noToday = html.match(/no_today[\s\S]{0,500}/);
    results.worldOilDetailDU = {
      status: resp.status,
      length: html.length,
      prices: prices ? prices.slice(0, 10) : null,
      values,
      noToday: noToday ? noToday[0].slice(0, 400) : null,
      first500: html.slice(0, 500),
    };
  } catch (err) {
    results.worldOilDetailDU = { error: err.message };
  }

  // 3: oilDetail 두바이유 (기존 - 이건 동적 로딩이라 안됨을 확인)  
  try {
    const resp = await fetch("https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU", { headers });
    const html = await resp.text();
    const prices = html.match(/\d{2,3}\.\d{2}/g);
    results.oilDetailDU = {
      status: resp.status,
      length: html.length,
      prices: prices ? prices.slice(0, 10) : null,
    };
  } catch (err) {
    results.oilDetailDU = { error: err.message };
  }

  return res.status(200).json({ debug: true, results });
}
