// pages/api/deepquant-apply.js
// /deepquant 랜딩의 "14일 무료 체험" 신청 접수
//
// 저장소를 두지 않는다. DEEPQUANT_APPLY_WEBHOOK 이 설정돼 있으면 그쪽으로 전달하고,
// 없으면 마스킹한 로그만 남긴 뒤 접수로 처리한다(전달 여부는 응답 delivered 로 구분).
// 개인정보라서 서버 로그에는 이름·연락처 원문을 남기지 않는다.

const EXCHANGES = ["Binance", "Bybit", "OKX", "Bitget", "아직 없음 (안내 필요)"];
const AMOUNTS = [
  "500만 원 미만",
  "500만 ~ 2,000만 원",
  "2,000만 ~ 5,000만 원",
  "5,000만 원 이상",
];

const MAX_NAME = 40;
const MAX_TEL = 20;

// 인스턴스별 best-effort 스로틀. 서버리스에서는 인스턴스마다 따로 세어지므로
// 완전한 방어는 아니고, 단순 반복 제출만 막는 용도다.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map();

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);

  // 오래된 항목 정리 (맵이 무한정 커지지 않게)
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return list.length > RATE_MAX;
}

/** 하이픈·공백·국가번호를 제거한 숫자만 남긴다. 실패하면 null. */
function normalizeTel(raw) {
  const digits = String(raw).replace(/[^\d+]/g, "").replace(/^\+?82/, "0");
  const only = digits.replace(/\D/g, "");
  if (only.length < 9 || only.length > 11) return null;
  if (!only.startsWith("0")) return null;
  return only;
}

function maskTel(tel) {
  return tel.slice(0, 3) + "*".repeat(Math.max(0, tel.length - 6)) + tel.slice(-3);
}

function maskName(name) {
  return name.length <= 1 ? name : name[0] + "*".repeat(name.length - 1);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 받습니다." });
  }

  if (rateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const name = String(body.name ?? "").trim();
  const telRaw = String(body.tel ?? "").trim();
  const exchange = String(body.exchange ?? "");
  const amount = String(body.amount ?? "");

  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ error: "이름을 확인해 주세요." });
  }
  if (!telRaw || telRaw.length > MAX_TEL) {
    return res.status(400).json({ error: "연락처를 확인해 주세요." });
  }
  const tel = normalizeTel(telRaw);
  if (!tel) {
    return res
      .status(400)
      .json({ error: "연락처 형식을 확인해 주세요. (예: 010-1234-5678)" });
  }
  if (!EXCHANGES.includes(exchange)) {
    return res.status(400).json({ error: "사용 예정 거래소를 다시 선택해 주세요." });
  }
  if (!AMOUNTS.includes(amount)) {
    return res.status(400).json({ error: "운용 예정 자금을 다시 선택해 주세요." });
  }
  if (body.privacy !== true || body.risk !== true) {
    return res.status(400).json({ error: "두 항목 모두 동의해 주셔야 접수됩니다." });
  }

  const application = {
    name,
    tel,
    exchange,
    amount,
    consent: { privacy: true, risk: true },
    receivedAt: new Date().toISOString(),
  };

  const webhook = process.env.DEEPQUANT_APPLY_WEBHOOK;
  let delivered = false;

  if (webhook) {
    try {
      const resp = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      });
      delivered = resp.ok;
      if (!resp.ok) {
        console.error(`[deepquant-apply] webhook ${resp.status}`);
      }
    } catch (e) {
      console.error("[deepquant-apply] webhook 전송 실패:", e.message);
    }
  }

  console.log(
    `[deepquant-apply] ${maskName(name)} / ${maskTel(tel)} / ${exchange} / ${amount} / delivered=${delivered}`
  );

  // 웹훅 전송에 실패해도 사용자에게는 접수로 응답한다. 담당자가 로그로 확인할 수 있고,
  // 사용자에게 재제출을 요구하면 중복 신청만 늘어나기 때문이다.
  return res.status(200).json({ ok: true, delivered });
}
