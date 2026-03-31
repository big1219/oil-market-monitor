// pages/api/dubai.js — DEBUG VERSION (임시)
// 네이버 금융 페이지의 실제 HTML 구조를 확인하기 위한 디버그용

export default async function handler(req, res) {
  try {
    const url = "https://finance.naver.com/marketindex/oilDetail.naver?marketindexCd=OIL_DU";
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": "https://finance.naver.com/marketindex/",
      },
    });

    const status = resp.status;
    const html = await resp.text();
    const length = html.length;

    // 가격 관련 HTML 영역 추출 (여러 패턴)
    const snippets = [];

    // 1. "no_today" 근처
    const m1 = html.match(/no_today[\s\S]{0,300}/);
    if (m1) snippets.push({ pattern: "no_today", text: m1[0].slice(0, 300) });

    // 2. "no_up" or "no_down" 근처
    const m2 = html.match(/no_(up|down)[\s\S]{0,200}/);
    if (m2) snippets.push({ pattern: "no_up/down", text: m2[0].slice(0, 200) });

    // 3. "blind" 클래스 근처
    const m3 = html.match(/class="blind"[\s\S]{0,200}/);
    if (m3) snippets.push({ pattern: "blind", text: m3[0].slice(0, 200) });

    // 4. "현재가" 근처
    const m4 = html.match(/현재가[\s\S]{0,300}/);
    if (m4) snippets.push({ pattern: "현재가", text: m4[0].slice(0, 300) });

    // 5. "전일대비" 근처
    const m5 = html.match(/전일대비[\s\S]{0,300}/);
    if (m5) snippets.push({ pattern: "전일대비", text: m5[0].slice(0, 300) });

    // 6. 3자리수.2자리수 패턴 (유가 범위)
    const pricePattern = html.match(/\d{3}\.\d{2}/g);
    if (pricePattern) snippets.push({ pattern: "3digit.2digit", matches: pricePattern.slice(0, 10) });

    // 7. 페이지 title
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) snippets.push({ pattern: "title", text: titleMatch[1] });

    // 8. body 앞부분 500자
    const bodyMatch = html.match(/<body[\s\S]{0,1000}/);
    if (bodyMatch) snippets.push({ pattern: "body_start", text: bodyMatch[0].slice(0, 500) });

    return res.status(200).json({
      debug: true,
      httpStatus: status,
      htmlLength: length,
      snippets,
      first500: html.slice(0, 500),
    });
  } catch (err) {
    return res.status(200).json({
      debug: true,
      error: err.message,
    });
  }
}
