import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

/* ==========================================================================
   DeepQuant — BTC 무기한 선물 자동매매 서비스 랜딩 페이지
   스타일은 styles/deepquant.css (globals.css 와 함께 _app.js 에서 로드)
   ========================================================================== */

// ─── SITE ───────────────────────────────────
const SITE = {
  name: "딥퀀트",
  brand: "DeepQuant",
  title: "딥퀀트 — 비트코인 선물 자동매매",
  description:
    "BTC 무기한 선물만 거래하는 알고리즘 트레이딩 시스템. 딥러닝이 진입 시점을 고르고, 레버리지·손절·청산 여유폭은 규칙 엔진이 고정합니다.",
  url: "https://deepquant.ai/",
};

const NAV = [
  { href: "#pipeline", label: "작동 방식" },
  { href: "#rules", label: "리스크 규칙" },
  { href: "#track", label: "실계좌 실적" },
  { href: "#custody", label: "자산 보관" },
  { href: "#pricing", label: "요금" },
  { href: "#faq", label: "자주 묻는 질문" },
];

// ─── CONTENT ────────────────────────────────
const TICKER = [
  { label: "BTCUSDT", value: "62,625", tag: "+1.84%", tone: "up" },
  { label: "펀딩비", value: "0.0312%", tag: "8h", tone: "mute" },
  { label: "미결제약정", value: "$18.4B" },
  { label: "24h 거래량", value: "$41.2B" },
  { label: "전략 상태", tag: "가동 중", tone: "up" },
  { label: "현재 포지션", value: "Long 2.5×" },
  { label: "청산 여유", value: "27.4%" },
  { label: "오늘 손실 한도 사용", value: "0.0% / 4.0%" },
  { label: "다음 리스크 점검", value: "00:00 UTC" },
];

const CONSOLE_POSITION = [
  { label: "포지션", value: "Long 0.42 BTC", tone: "up" },
  { label: "레버리지 / 마진", value: "2.5× 격리" },
  { label: "진입가", value: "61,840" },
  { label: "미실현 손익", value: "+1.27%", tone: "up" },
];

// 가드레일 눈금: left(%) 는 track/labels 양쪽에서 함께 쓰인다
const GUARDRAILS = [
  { key: "liq", left: 6, price: "58,110", label: "강제청산", color: "dn" },
  { key: "stop", left: 18, price: "60,910", label: "손절", color: "warn" },
  { key: "now", left: 52, price: "62,625", label: "현재가" },
  { key: "tp", left: 88, price: "64,450", label: "익절", color: "up" },
];

const CONSOLE_LOG = [
  { time: "14:02:11", text: "손절가 60,910 고정 · 청산 여유 27.4% 확인 · 진입 승인" },
  { time: "14:02:12", text: "Long 0.42 BTC @ 61,840 체결 · 근거: 추세 필터 + 변동성 축소" },
  { time: "13:40:00", text: "펀딩비 0.031% · 임계치 이하 · 신규 진입 허용" },
];

const STATS = [
  { to: 30, label: "실운용 개월" },
  { to: 342, label: "누적 체결 건수" },
  { to: 0, label: "리스크 규칙 위반" },
  { to: 0, label: "강제청산 발생" },
];

const WHY = [
  {
    title: "유동성이 가장 깊은 시장",
    body: "BTC 무기한 선물은 가상자산 파생상품 중 거래량이 압도적으로 큽니다. 슬리피지가 작아 백테스트와 실거래의 괴리가 가장 적습니다.",
  },
  {
    title: "양방향 대응",
    body: "선물이기에 하락장에서도 숏으로 대응합니다. 다만 레버리지는 상한 3배, 격리 마진만 사용합니다. 크게 이기기 위한 도구가 아니라 크게 잃지 않기 위한 구조입니다.",
  },
  {
    title: "한 종목이라 전부 설명할 수 있음",
    body: "모든 진입과 청산에 근거를 한 줄로 남깁니다. 종목이 하나이니 어떤 규칙이 어떻게 작동했는지 고객이 직접 검증할 수 있습니다.",
  },
];

const SCOPE_IN = [
  "BTCUSDT 무기한 선물 (USDT 마진)",
  "롱 · 숏 양방향",
  "격리 마진, 레버리지 1~3배",
];
const SCOPE_OUT = [
  "알트코인 선물",
  "교차 마진, 10배 이상 고레버리지",
  "현물, 옵션, 밈코인",
  "고객 자산 보관 · 대리 출금",
];

const PIPELINE = [
  {
    cls: "c-data",
    title: "시장 데이터",
    body: "Binance·Bybit 체결, 호가, 펀딩비, 미결제약정을 초 단위로 수집",
    icon: (
      <>
        <path d="M4 18 L9 11 L13 14 L20 5" />
        <path d="M15 5h5v5" />
      </>
    ),
  },
  {
    cls: "c-signal",
    title: "신호 모델",
    body: "추세·변동성 국면을 분류해 진입 방향과 시점을 제안",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  {
    cls: "risk c-risk",
    title: "리스크 엔진",
    badge: "거부 권한",
    body: "레버리지·손절·청산 여유·일일 손실 한도를 검사. 하나라도 어기면 거부",
    icon: (
      <>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    cls: "c-exec",
    title: "주문 집행",
    body: "손절 주문을 진입 주문과 동시에 거래소에 전송. 서버가 죽어도 손절은 거래소에 남음",
    icon: <path d="M4 7h16M4 12h16M4 17h10" />,
  },
  {
    cls: "c-exec",
    title: "거래소 계좌",
    body: "고객 명의 계좌에서 체결. 자산은 이동하지 않음",
    icon: (
      <>
        <path d="M4 19h16" />
        <path d="M6 19V9l6-4 6 4v10" />
        <path d="M10 19v-5h4v5" />
      </>
    ),
  },
];

const RULES = [
  {
    name: "레버리지 상한",
    value: "3×",
    body: "격리 마진만 사용. 잔고 대비 명목 포지션이 3배를 넘는 주문은 리스크 엔진이 거부합니다.",
  },
  {
    name: "1회 거래 최대 손실",
    value: "−1.5%",
    body: "계좌 잔고 기준. 손절가는 진입과 동시에 거래소에 등록되고, 진입 후 불리한 방향으로는 옮길 수 없습니다.",
  },
  {
    name: "일일 손실 한도",
    value: "−4.0%",
    body: "당일 누적 손실이 한도에 닿으면 모든 포지션을 정리하고 다음 날 00:00 UTC까지 신규 진입을 멈춥니다.",
  },
  {
    name: "강제청산 여유폭",
    value: "≥ 25%",
    body: "진입 시점 청산가까지의 거리가 25% 미만이면 진입하지 않습니다. 손절이 청산보다 항상 먼저 작동하도록 설계됩니다.",
  },
  {
    name: "펀딩비 필터",
    value: "0.05%",
    body: "8시간 펀딩비가 임계치를 넘는 방향으로는 신규 진입을 제한해 보유 비용이 수익을 갉아먹지 않게 합니다.",
  },
  {
    name: "월간 낙폭 서킷브레이커",
    value: "−10%",
    body: "월 누적 낙폭이 −10%에 이르면 전략을 정지하고 담당자가 고객에게 직접 연락해 재개 여부를 확인합니다.",
  },
];

const KPIS = [
  { label: "누적 수익률 (30개월)", value: "+47.9%", tone: "up" },
  { label: "최대 낙폭", value: "−14.2%", tone: "dn" },
  { label: "승률 / 손익비", value: "46% / 1.9" },
  { label: "월 수익 달 / 손실 달", value: "19 / 11" },
];

const MONTHLY = [
  { month: "2026.08", dq: "+3.4%", btc: "+1.2%", trades: 14, mdd: "−2.1%" },
  { month: "2026.07", dq: "−1.8%", btc: "−4.9%", trades: 11, mdd: "−3.6%" },
  { month: "2026.06", dq: "+5.7%", btc: "+9.3%", trades: 16, mdd: "−1.9%" },
  { month: "2026.05", dq: "−2.6%", btc: "−7.8%", trades: 9, mdd: "−4.0%" },
  { month: "2026.04", dq: "+2.9%", btc: "+0.4%", trades: 12, mdd: "−1.4%" },
  { month: "2026.03", dq: "+1.1%", btc: "−3.2%", trades: 10, mdd: "−2.8%" },
];

const EXCHANGES = [
  { name: "Binance", symbol: "BTCUSDT Perpetual" },
  { name: "Bybit", symbol: "BTCUSDT Perpetual" },
  { name: "OKX", symbol: "BTC-USDT-SWAP" },
  { name: "Bitget", symbol: "BTCUSDT Perpetual" },
];

const PERMISSIONS = [
  { name: "잔고 · 포지션 조회", allowed: true },
  { name: "선물 주문 생성 · 취소", allowed: true },
  { name: "출금", allowed: false },
  { name: "내부 이체 · 지갑 간 이동", allowed: false },
  { name: "현물 · 옵션 · 서브계정 접근", allowed: false },
];

const TEAM = [
  {
    name: "○○○ 대표",
    role: "前 ○○증권 파생상품 트레이더 · 8년",
    body: "규칙을 어기는 순간 계좌가 망가진다는 것을 데스크에서 배웠습니다. 그래서 규칙을 어길 수 없는 프로그램을 만들었습니다.",
  },
  {
    name: "○○○ CTO",
    role: "前 ○○ 리서치 ML 엔지니어 · 시계열 예측",
    body: "모델은 방향을 제안할 뿐입니다. 손절과 레버리지는 모델이 손댈 수 없는 코드로 고정했습니다.",
  },
];

const PRICING = {
  plan: "스탠다드 · 거래소 계좌 1개",
  amount: "99,000",
  note: "부가세 포함 · 14일 무료 체험 후 결제",
  chips: ["성과 보수 0%", "약정 없음", "언제든 해지"],
  features: [
    "성과 보수·수익 배분 없음",
    "거래소 수수료·펀딩비는 거래소에 직접 납부 (딥퀀트 무관)",
    "모든 체결의 근거 기록과 월간 리포트 제공",
    "텔레그램 · 문자로 진입 · 청산 · 정지 알림",
    "담당자 전화 · 원격 설치 지원 (고객 요청 시에만)",
    "계약서에 리스크 규칙 수치 명시",
  ],
};

const FAQ = [
  {
    q: "선물 거래인데 원금보다 더 잃을 수 있나요?",
    a: "격리 마진을 사용하므로 최악의 경우 해당 포지션에 배정된 증거금까지 손실됩니다. 다만 거래소의 급격한 갭이나 장애 상황에서는 손절가보다 불리한 가격에 체결되거나 강제청산이 일어날 수 있습니다. 감당할 수 있는 자금만 운용하시기를 권합니다.",
  },
  {
    q: "딥퀀트가 제 돈을 가져갈 수 있나요?",
    a: "없습니다. 자산은 고객 명의의 거래소 계좌에 있고, 우리는 출금 권한이 없는 API 키로 주문만 넣습니다. 거래소에서 키를 삭제하면 즉시 중단됩니다.",
  },
  {
    q: "\"AI\"라는 게 정확히 무엇을 하나요?",
    a: "시장 국면(추세·횡보·고변동)을 분류해 진입 방향과 시점을 제안하는 역할만 합니다. 레버리지, 손절, 청산 여유폭, 손실 한도 같은 리스크 규칙은 고정된 코드이며 AI가 건드릴 수 없습니다.",
  },
  {
    q: "수익을 보장하나요?",
    a: "보장하지 않습니다. 손실이 나는 달도 있고, 실제로 최근 30개월 중 11개월은 손실이었습니다. 우리가 약속하는 것은 수익이 아니라, 정해진 규칙을 예외 없이 지키는 것입니다.",
  },
  {
    q: "국내 거래소(업비트·빗썸)로는 안 되나요?",
    a: "국내 원화 거래소는 선물 상품을 제공하지 않습니다. Binance, Bybit, OKX, Bitget의 USDT 무기한 선물 계좌가 필요하며, 계좌 개설과 자금 이동은 고객이 직접 진행합니다.",
  },
  {
    q: "무료 체험은 어떻게 진행되나요?",
    a: "신청 후 영업일 1일 이내 담당자가 연락드립니다. 14일 동안 거래소 테스트넷 또는 소액 실계좌로 운용해 보실 수 있고, 체험 중 해지하면 비용이 없습니다.",
  },
  {
    q: "세금이나 신고는 어떻게 되나요?",
    a: "가상자산 거래로 발생한 소득의 신고·납부와 해외 계좌 관련 의무는 이용자 본인에게 있습니다. 딥퀀트는 세무·법률 자문을 제공하지 않으며, 필요 시 전문가와 상담하시기를 권합니다.",
  },
];

const APPLY_STEPS = [
  "영업일 1일 이내 담당자가 전화로 연락드립니다.",
  "거래소 API 키 발급을 안내드립니다. 출금 권한은 절대 켜지 않습니다.",
  "리스크 규칙 수치를 함께 확인하고 전략을 시작합니다.",
];

export const EXCHANGE_OPTIONS = [
  "Binance",
  "Bybit",
  "OKX",
  "Bitget",
  "아직 없음 (안내 필요)",
];
export const AMOUNT_OPTIONS = [
  "500만 원 미만",
  "500만 ~ 2,000만 원",
  "2,000만 ~ 5,000만 원",
  "5,000만 원 이상",
];

const RISK_NOTICE = [
  "본 서비스는 자동매매 소프트웨어의 이용권을 제공하는 것으로, 자본시장법상 투자자문·투자일임업이나 가상자산 매매의 중개·알선·권유에 해당하지 않습니다. 딥퀀트는 특정 매매를 권유하지 않으며, 최종 투자 판단과 책임은 이용자 본인에게 있습니다.",
  "가상자산 선물(무기한 계약)은 레버리지를 사용하는 고위험 상품입니다. 가격 변동에 따라 짧은 시간에 증거금 전액을 잃을 수 있으며, 급격한 시장 변동·거래소 장애 시 손절 주문이 예정 가격에 체결되지 않거나 강제청산될 수 있습니다.",
  "과거 운용 성과는 미래 수익을 보장하지 않습니다. 본 페이지의 성과 수치는 회사 자금 계좌 기준이며, 고객 계좌의 결과는 진입 시점·자금 규모·거래소·네트워크 상태에 따라 달라질 수 있습니다. 제3자 감사를 받은 자료가 아닙니다.",
  "딥퀀트는 고객 자산을 수취·보관·이체하지 않습니다. 이용자는 출금 권한이 없는 API 키만 발급해야 하며, 출금 권한이 포함된 키를 제공함으로써 발생하는 손실에 대해 딥퀀트는 책임지지 않습니다.",
  "해외 거래소 이용에 따른 가입 조건 준수, 세금 신고·납부, 해외 계좌 관련 의무 등 관련 법령의 준수 책임은 이용자에게 있습니다. 서비스는 관련 법령·거래소 정책 변경에 따라 예고 후 변경 또는 종료될 수 있습니다.",
  "딥퀀트 서버·네트워크·거래소 API의 장애로 주문 지연·미체결이 발생할 수 있습니다. 장애 시 신규 진입은 자동 중단되나, 기존 포지션의 손익은 이용자에게 귀속됩니다.",
  "이용료는 정액제이며 성과 보수·수익 배분은 없습니다. 청약철회 및 환불 조건은 이용약관을 따릅니다.",
];

// ─── HOOKS ──────────────────────────────────
/** 뷰포트에 들어오면 0 → to 로 세는 카운터. reduced-motion 이면 즉시 최종값. */
function useCountUp(to, duration = 1400) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion:reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        io.unobserve(el);

        let t0 = null;
        const step = (t) => {
          if (t0 === null) t0 = t;
          const k = Math.min(1, (t - t0) / duration);
          setValue(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return [ref, value];
}

// ─── COMPONENTS ─────────────────────────────
function LogoMark() {
  return (
    <svg className="mk" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="dq-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8FC0FF" />
          <stop offset="1" stopColor="#2F6BFF" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill="#0B192F" stroke="url(#dq-logo-g)" strokeWidth="4.5" />
      <path
        d="M17 41 L26 30 L33 36.5 L47 21"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 21 L47 21 L47 30"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SiteHeader() {
  return (
    <header>
      <div className="wrap">
        <a className="logo" href="#top">
          <LogoMark />
          <span className="wm">
            {SITE.brand} <b>AI</b>
          </span>
        </a>
        <nav aria-label="주요 섹션">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-primary" href="#apply">
          14일 무료 체험
        </a>
      </div>
    </header>
  );
}

function HeroVisual() {
  const NET_PATHS = [
    "M40 70 C120 70 130 150 190 150",
    "M40 130 C120 130 130 150 190 150",
    "M40 190 C120 190 130 150 190 150",
    "M40 130 C120 130 130 260 190 260",
    "M40 190 C120 190 130 260 190 260",
    "M40 250 C120 250 130 260 190 260",
    "M40 310 C120 310 130 260 190 260",
    "M40 70 C120 70 130 205 190 205",
    "M40 250 C120 250 130 205 190 205",
    "M40 310 C120 310 130 205 190 205",
    "M190 150 C220 150 220 205 236 205",
    "M190 205 L236 205",
    "M190 260 C220 260 220 205 236 205",
  ];
  const INPUTS = [
    { y: 70, label: "체결 · 호가" },
    { y: 130, label: "펀딩비" },
    { y: 190, label: "미결제약정" },
    { y: 250, label: "변동성 국면" },
    { y: 310, label: "추세 강도" },
  ];
  const OUTPUTS = [
    { y: 150, text: "LONG 진입 승인", fill: "#8FC0FF", weight: 600 },
    { y: 190, text: "손절 60,910 고정", fill: "#E8EEF7" },
    { y: 230, text: "레버리지 2.5×", fill: "#9DB0CC" },
  ];
  // 배경 캔들: [x, 심지 시작, 심지 끝, 몸통 y, 몸통 높이]
  const CANDLES_BACK = [
    [30, 300, 360, 312, 34],
    [90, 270, 335, 284, 40],
    [210, 250, 300, 258, 30],
    [330, 210, 262, 218, 28],
    [450, 150, 205, 160, 30],
  ];
  const CANDLES_FRONT = [
    [60, 280, 350, 292, 44],
    [120, 255, 320, 262, 46],
    [150, 240, 290, 248, 30],
    [180, 230, 280, 236, 34],
    [240, 215, 285, 224, 46],
    [270, 200, 250, 206, 34],
    [300, 185, 245, 194, 40],
    [360, 170, 225, 178, 36],
    [390, 150, 205, 158, 36],
    [420, 135, 190, 142, 38],
    [480, 120, 175, 128, 36],
    [510, 100, 160, 108, 40],
    [540, 85, 140, 92, 36],
  ];
  const candle = ([x, y1, y2, ry, rh], i) => (
    <g key={i}>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <rect x={x - 4} y={ry} width="8" height={rh} />
    </g>
  );

  return (
    <div className="ai-visual">
      <svg viewBox="0 0 560 440" xmlns="http://www.w3.org/2000/svg" role="img"
        aria-label="입력 특성 5개가 신호 모델을 거쳐 리스크 검증 후 주문으로 이어지는 개념도">
        <defs>
          <linearGradient id="dq-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7FB3FF" />
            <stop offset="1" stopColor="#2F6BFF" />
          </linearGradient>
          <radialGradient id="dq-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#3D7BFF" stopOpacity=".55" />
            <stop offset="1" stopColor="#3D7BFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dq-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#3D7BFF" stopOpacity="0" />
            <stop offset=".5" stopColor="#3D7BFF" stopOpacity=".9" />
            <stop offset="1" stopColor="#F7931A" stopOpacity=".9" />
          </linearGradient>
        </defs>

        <g className="candles" opacity=".22">
          <g stroke="#5A6F95" fill="#5A6F95">{CANDLES_BACK.map(candle)}</g>
          <g stroke="#7E9AC8" fill="#7E9AC8">{CANDLES_FRONT.map(candle)}</g>
        </g>

        <circle cx="300" cy="205" r="175" fill="url(#dq-glow)" />

        <g className="net" stroke="#3D7BFF" strokeWidth="1.2" fill="none" strokeOpacity=".55">
          {NET_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill="#0F1F3A" stroke="#7FB3FF" strokeWidth="1.5">
          {INPUTS.map((n) => (
            <circle key={n.y} cx="40" cy={n.y} r="6" />
          ))}
          <circle cx="190" cy="150" r="8" />
          <circle cx="190" cy="205" r="8" />
          <circle cx="190" cy="260" r="8" />
        </g>
        <g fill="#B7C5DA" fontFamily="IBM Plex Sans KR, sans-serif" fontSize="12">
          {INPUTS.map((n) => (
            <text key={n.y} x="54" y={n.y + 4}>
              {n.label}
            </text>
          ))}
        </g>

        <circle cx="300" cy="205" r="64" fill="#0B192F" stroke="url(#dq-ring)" strokeWidth="5" />
        <circle cx="300" cy="205" r="76" fill="none" stroke="#3D7BFF" strokeOpacity=".25" strokeWidth="1" />
        <path
          className="arrow"
          d="M266 232 L285 208 L300 222 L333 180"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M318 178 L335 178 L335 195"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path className="sig" d="M364 205 L410 205" stroke="url(#dq-fade)" strokeWidth="2" />
        <g className="out">
          {OUTPUTS.map((o) => (
            <g key={o.y}>
              <rect x="412" y={o.y} width="130" height="34" rx="7" fill="#0F1F3A" stroke="#22375A" />
              <text
                x="426"
                y={o.y + 22}
                fill={o.fill}
                fontFamily="IBM Plex Sans KR, sans-serif"
                fontSize="12.5"
                fontWeight={o.weight}
              >
                {o.text}
              </text>
            </g>
          ))}
        </g>

        <text x="300" y="322" textAnchor="middle" fill="#E8EEF7" fontFamily="IBM Plex Sans KR, sans-serif" fontSize="15" fontWeight="600">
          {SITE.brand} AI
        </text>
        <text x="300" y="342" textAnchor="middle" fill="#9DB0CC" fontFamily="IBM Plex Sans KR, sans-serif" fontSize="12">
          딥러닝 신호 모델 + 규칙 기반 리스크 엔진
        </text>
        <g fill="#7E92B0" fontFamily="IBM Plex Sans KR, sans-serif" fontSize="11.5">
          <text x="24" y="420">입력 5개 특성</text>
          <text x="164" y="420">국면 분류</text>
          <text x="262" y="420">신호 생성</text>
          <text x="412" y="420">리스크 검증 후 집행</text>
        </g>
      </svg>
    </div>
  );
}

function Hero() {
  return (
    <div className="hero dark" id="top">
      <div className="wrap">
        <div>
          <p className="kicker">
            <span className="tag">AI 알고리즘 트레이딩</span>
            <span className="tag">BTC 선물 전용</span>
          </p>
          <h1>
            <span className="l1">AI가 읽고, 알고리즘이 거래합니다.</span>
            <span className="l2">규칙은 코드가 지킵니다.</span>
          </h1>
          <p className="lede">
            BTC 무기한 선물만 거래하는 알고리즘 트레이딩 시스템입니다.
            <br />
            딥러닝이 진입 시점을 고르고, 레버리지·손절·청산 여유폭은 규칙 엔진이 고정합니다.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#apply">
              14일 무료 체험 신청
            </a>
            <a className="btn btn-ghost" href="#track">
              실계좌 실적 보기
            </a>
          </div>
          <p className="tagline">
            <span>BTC 1종목.</span>
            <span>레버리지 3× 상한.</span>
            <span>성과 보수 0.</span>
          </p>
        </div>
        <HeroVisual />
      </div>
    </div>
  );
}

function Ticker() {
  const set = (hidden) => (
    <div className="tk-set" aria-hidden={hidden || undefined}>
      {TICKER.map((t) => (
        <span key={t.label}>
          <b>{t.label}</b>
          {t.value ? ` ${t.value}` : null}
          {t.tag ? <i className={t.tone === "up" ? "up" : t.tone === "mute" ? "mute" : ""}>{t.tag}</i> : null}
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker dark" aria-label="시장 지표 예시">
      {/* 두 벌을 이어 붙여 -50% 이동으로 끊김 없이 순환시킨다 */}
      <div className="tk-track">
        {set(false)}
        {set(true)}
      </div>
    </div>
  );
}

function StrategyConsole() {
  return (
    <div className="console" aria-label="전략 콘솔 예시">
      <div className="bar">
        <span className="live">
          <i aria-hidden="true" />
          전략 가동 중
        </span>
        <span className="mono">BTCUSDT 무기한 · Binance</span>
      </div>

      <div className="pos">
        {CONSOLE_POSITION.map((p) => (
          <div key={p.label}>
            <span>{p.label}</span>
            <b className={`mono${p.tone === "up" ? " up" : ""}`}>{p.value}</b>
          </div>
        ))}
      </div>

      <div className="ladder">
        <div className="cap">
          <span>가격 가드레일</span>
          <span className="mono">현재가 62,625</span>
        </div>
        <div className="track">
          {GUARDRAILS.map((g) => (
            <i key={g.key} className={`tick ${g.key}`} style={{ left: `${g.left}%` }} />
          ))}
        </div>
        <div className="labels">
          {GUARDRAILS.map((g) => (
            <span key={g.key} style={{ left: `${g.left}%` }}>
              <b
                className={`mono${g.color === "dn" ? " dn" : g.color === "up" ? " up" : ""}`}
                style={g.color === "warn" ? { color: "#ffd08a" } : undefined}
              >
                {g.price}
              </b>
              {g.label}
            </span>
          ))}
        </div>
      </div>

      <div className="eq">
        <div className="cap">
          <span>청산가까지 여유</span>
          <span className="mono up">27.4% (기준 25% 이상)</span>
        </div>
        <svg viewBox="0 0 520 90" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="dq-eq" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#5E96FF" stopOpacity=".35" />
              <stop offset="1" stopColor="#5E96FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 70 L30 66 L60 68 L90 58 L120 60 L150 52 L180 56 L210 44 L240 47 L270 40 L300 43 L330 33 L360 36 L390 28 L420 31 L450 22 L480 25 L520 16 L520 90 L0 90Z"
            fill="url(#dq-eq)"
          />
          <path
            d="M0 70 L30 66 L60 68 L90 58 L120 60 L150 52 L180 56 L210 44 L240 47 L270 40 L300 43 L330 33 L360 36 L390 28 L420 31 L450 22 L480 25 L520 16"
            stroke="#5E96FF"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="log mono">
        {CONSOLE_LOG.map((l) => (
          <div key={l.time + l.text}>
            <span>{l.time}</span>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsoleBand() {
  return (
    <div className="band dark">
      <div className="wrap">
        <div className="band-grid">
          <div className="band-intro">
            <h2>지금 이 순간의 전략 콘솔</h2>
            <p className="sub">
              고객 대시보드에서 보는 화면 그대로입니다. 강제청산·손절·현재가·익절이 어디에 있는지,
              청산까지 여유가 얼마나 남았는지 항상 표시됩니다.
            </p>
          </div>
          <StrategyConsole />
        </div>
      </div>
    </div>
  );
}

function StatCell({ to, label }) {
  const [ref, value] = useCountUp(to);
  return (
    <div>
      <b className="mono" ref={ref}>
        {value.toLocaleString()}
      </b>
      <span>{label}</span>
    </div>
  );
}

function Stats() {
  return (
    <section className="stats dark">
      <div className="wrap">
        <h2>운영 지표</h2>
        <p className="sub">2024년 3월 실운용 시작 이후 누적치입니다. 매월 첫 영업일에 갱신됩니다.</p>
        <div className="sgrid">
          {STATS.map((s) => (
            <StatCell key={s.label} to={s.to} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Focus() {
  return (
    <section className="focus">
      <div className="wrap">
        <h2>왜 비트코인 선물 하나만 하는가</h2>
        <p className="sub">
          여러 종목을 다루면 화면은 화려해지지만, 전략은 얕아집니다. 우리는 가장 유동성이 깊고
          데이터가 가장 긴 시장 하나에 모든 검증을 집중했습니다.
        </p>
        <div className="grid">
          <div className="why">
            {WHY.map((w) => (
              <div key={w.title}>
                <b>{w.title}</b>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
          <div className="scope">
            <h3>거래 범위</h3>
            <ul>
              {SCOPE_IN.map((s) => (
                <li className="yes" key={s}>
                  <i aria-hidden="true">✓</i>
                  {s}
                </li>
              ))}
              <li className="sep" role="separator" />
              {SCOPE_OUT.map((s) => (
                <li className="no" key={s}>
                  <i aria-hidden="true">✕</i>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section className="pipe dark" id="pipeline">
      <div className="wrap">
        <h2>주문 하나가 나가기까지</h2>
        <p className="sub">
          AI가 신호를 내도, 리스크 엔진이 거부하면 주문은 나가지 않습니다. 리스크 엔진의 규칙은
          AI가 바꿀 수 없습니다.
        </p>
        <div className="flow">
          <div className="rail" aria-hidden="true">
            <i className="packet" />
          </div>
          {PIPELINE.map((n) => (
            <div className={`node ${n.cls}`} key={n.title}>
              <div className="dot">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {n.icon}
                </svg>
              </div>
              <b>
                {n.title}
                {n.badge ? <em className="badge">{n.badge}</em> : null}
              </b>
              <p>{n.body}</p>
            </div>
          ))}
        </div>
        <div className="note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9L2.6 17.1A2 2 0 004.3 20h15.4a2 2 0 001.7-2.9L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <div>
            손절은 거래소 서버에 조건부 주문으로 등록됩니다. 딥퀀트 서버나 통신에 장애가 생겨도 손절
            주문은 거래소에 유지되며, 장애 시 신규 진입은 자동으로 중단됩니다. 단, 거래소 자체의
            장애·급격한 갭 발생 시에는 손절가와 다른 가격에 체결되거나 강제청산될 수 있습니다.
          </div>
        </div>
      </div>
    </section>
  );
}

function Rules() {
  return (
    <section className="rules" id="rules">
      <div className="wrap">
        <h2>AI도 바꿀 수 없는 리스크 규칙</h2>
        <p className="sub">아래 값은 서비스 계약서에 명시되며, 변경 시 최소 30일 전 고객에게 서면 고지합니다.</p>
        <div className="list">
          {RULES.map((r) => (
            <div className="row" key={r.name}>
              <b>{r.name}</b>
              <span className="val mono">{r.value}</span>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
        <p className="fine">
          위 수치는 기본 설정이며, 고객은 더 보수적인 값으로만 조정할 수 있습니다. 더 공격적인 값은
          설정 화면에서 선택할 수 없습니다.
        </p>
      </div>
    </section>
  );
}

function TrackRecord() {
  const cell = (v) => (v.startsWith("+") ? "n up" : v.startsWith("−") || v.startsWith("-") ? "n dn" : "n");
  return (
    <section className="track dark" id="track">
      <div className="wrap">
        <div className="top">
          <div>
            <h2>실계좌 실적, 나쁜 달까지 그대로</h2>
            <p className="sub">
              2024년 3월부터 회사 자금으로 실제 계좌를 운용하고 있습니다. 백테스트가 아닌 체결 원장
              기준이며, 수수료·펀딩비를 반영한 수치입니다.
            </p>
          </div>
          <div className="kpis mono">
            {KPIS.map((k) => (
              <div key={k.label}>
                <span>{k.label}</span>
                <b className={k.tone || ""}>{k.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="chart">
          <div className="cap">
            <span>계좌 자산 추이 (시작 = 100)</span>
            <span className="lg">
              <span>
                <i style={{ background: "#5E96FF" }} />
                딥퀀트 실계좌
              </span>
              <span>
                <i style={{ background: "#63779A" }} />
                BTC 단순 보유
              </span>
            </span>
          </div>
          <svg viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label="딥퀀트 실계좌와 BTC 단순 보유의 자산 추이 비교 차트">
            <g stroke="#22375A" strokeWidth="1">
              <line x1="0" y1="65" x2="1000" y2="65" />
              <line x1="0" y1="130" x2="1000" y2="130" />
              <line x1="0" y1="195" x2="1000" y2="195" />
            </g>
            <path
              d="M0 175 L60 150 L120 200 L180 120 L240 165 L300 100 L360 130 L420 60 L480 140 L540 95 L600 180 L660 110 L720 70 L780 125 L840 85 L900 105 L960 90 L1000 98"
              stroke="#63779A"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />
            <path
              d="M0 175 L60 168 L120 178 L180 150 L240 158 L300 138 L360 146 L420 118 L480 132 L540 116 L600 140 L660 112 L720 100 L780 118 L840 96 L900 104 L960 88 L1000 80"
              stroke="#5E96FF"
              strokeWidth="2.5"
              fill="none"
            />
          </svg>
          <div className="cap axis">
            <span>2024.03</span>
            <span>2025.03</span>
            <span>2026.08</span>
          </div>
        </div>

        <div className="tablewrap">
          <table>
            <caption className="sr-only">최근 6개월 월별 성과</caption>
            <thead>
              <tr>
                <th scope="col">월</th>
                <th scope="col" className="n">딥퀀트</th>
                <th scope="col" className="n">BTC 보유</th>
                <th scope="col" className="n">거래 수</th>
                <th scope="col" className="n">최대 낙폭</th>
              </tr>
            </thead>
            <tbody className="mono">
              {MONTHLY.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td className={cell(m.dq)}>{m.dq}</td>
                  <td className="n">{m.btc}</td>
                  <td className="n">{m.trades}</td>
                  <td className="n">{m.mdd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="disc">
          <strong>읽기 전에 알아두실 것</strong>
          <br />
          과거 성과는 미래 수익을 보장하지 않습니다. 위 수치는 회사 자금 계좌의 실제 체결 원장
          기준이며, 고객 계좌의 결과는 진입 시점·자금 규모·거래소·네트워크 상태에 따라 달라집니다.
          전체 30개월 월별 내역과 체결 원장(CSV)은 체험 신청 후 열람하실 수 있습니다. 표시 수치는
          매월 첫 영업일에 갱신되며, 감사 또는 제3자 검증을 받은 자료가 아닙니다.
        </p>
      </div>
    </section>
  );
}

function Custody() {
  return (
    <section className="custody" id="custody">
      <div className="wrap">
        <h2>자산은 고객 계좌에, 우리는 주문 권한만</h2>
        <p className="sub">
          딥퀀트는 고객의 돈을 받지도, 보관하지도 않습니다. 고객이 직접 개설한 거래소 계좌에 출금
          권한이 없는 API 키로만 연결합니다.
        </p>
        <div className="grid">
          <div>
            <h3 className="ex-h">지원 거래소 (USDT 무기한 선물)</h3>
            <div className="ex">
              {EXCHANGES.map((e) => (
                <div key={e.name}>
                  <b>{e.name}</b>
                  <span>{e.symbol}</span>
                </div>
              ))}
            </div>
            <p className="ex-note">
              국내 원화 거래소는 가상자산 선물을 제공하지 않아 해외 거래소 계좌가 필요합니다. 거래소
              가입·본인인증·자금 이동은 고객이 직접 진행하며, 딥퀀트는 이를 대행하지 않습니다.
            </p>
          </div>
          <div className="perm">
            <h3>API 키 권한 범위</h3>
            {PERMISSIONS.map((p) => (
              <div className={`p ${p.allowed ? "on" : "off"}`} key={p.name}>
                <span>{p.name}</span>
                <em>{p.allowed ? "허용" : "불가"}</em>
              </div>
            ))}
            <p className="fine">
              API 키에는 딥퀀트 서버 IP만 화이트리스트로 등록하도록 안내드립니다. 고객이 거래소에서
              키를 삭제하면 그 즉시 모든 자동매매가 중단되며, 별도 해지 절차가 필요 없습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Team() {
  return (
    <section className="team">
      <div className="wrap">
        <h2>만든 사람들</h2>
        <p className="sub">
          딥퀀트는 파생상품 트레이딩과 머신러닝을 각각 10년 가까이 해온 두 사람이 시작했습니다. 우리
          돈으로 먼저 운용했고, 그 결과를 그대로 공개합니다.
        </p>
        <div className="people">
          {TEAM.map((t) => (
            <div className="person" key={t.name}>
              <div className="ava" aria-hidden="true" />
              <div>
                <b>{t.name}</b>
                <span>{t.role}</span>
                <p>{t.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="exrow">
          <span className="lbl">연동 거래소</span>
          {EXCHANGES.map((e) => (
            <span key={e.name}>{e.name}</span>
          ))}
          <span className="lbl push">알림 채널</span>
          <span>Telegram</span>
          <span>카카오톡 채널</span>
          <span>SMS</span>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="price" id="pricing">
      <div className="wrap">
        <h2>요금은 정액제, 수익 배분은 없습니다</h2>
        <p className="sub">
          고객이 벌면 우리가 더 가져가는 구조는 위험을 키우게 만듭니다. 그래서 성과 보수를 받지
          않습니다.
        </p>
        <div className="card">
          <div>
            <p className="plan">{PRICING.plan}</p>
            <p className="amt">
              <span className="cur">월</span>
              <span className="num">{PRICING.amount}</span>
              <span className="cur">원</span>
            </p>
            <p className="vat">{PRICING.note}</p>
            <div className="chips">
              {PRICING.chips.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <a className="btn btn-primary" href="#apply">
              14일 무료 체험 신청
            </a>
            <p className="fine">
              체험 기간 중 해지 시 비용이 발생하지 않으며, 결제 후에도 이용약관에 따른
              청약철회·환불이 가능합니다.
            </p>
          </div>
          <ul>
            {PRICING.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <h2>자주 묻는 질문</h2>
        <div className="qs">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

const EMPTY_FORM = {
  name: "",
  tel: "",
  exchange: EXCHANGE_OPTIONS[0],
  amount: AMOUNT_OPTIONS[0],
  privacy: false,
  risk: false,
};

function Apply() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done

  const set = useCallback(
    (key) => (e) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      })),
    []
  );

  async function submit() {
    if (!form.name.trim() || !form.tel.trim() || !form.privacy || !form.risk) {
      setError("이름, 연락처를 입력하고 두 항목 모두 동의해 주세요.");
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/deepquant-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("네트워크 오류로 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setState("idle");
    }
  }

  return (
    <section className="apply dark" id="apply">
      <div className="wrap">
        <div>
          <h2>14일 무료 체험</h2>
          <p className="sub">
            모의계좌 또는 소액 실계좌로 직접 확인해 보세요. 이름과 연락처만 남겨 주시면 됩니다.
          </p>
          <div className="steps">
            {APPLY_STEPS.map((s, i) => (
              <div key={s}>
                <i aria-hidden="true">{i + 1}</i>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <form
          className="form"
          id="apply-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <div className="row">
            <div>
              <label htmlFor="f-name">이름</label>
              <input id="f-name" name="name" type="text" placeholder="홍길동" autoComplete="name"
                value={form.name} onChange={set("name")} disabled={state !== "idle"} />
            </div>
            <div>
              <label htmlFor="f-tel">연락처</label>
              <input id="f-tel" name="tel" type="tel" placeholder="010-0000-0000" autoComplete="tel"
                value={form.tel} onChange={set("tel")} disabled={state !== "idle"} />
            </div>
          </div>
          <div className="row">
            <div>
              <label htmlFor="f-ex">사용 예정 거래소</label>
              <select id="f-ex" name="exchange" value={form.exchange} onChange={set("exchange")} disabled={state !== "idle"}>
                {EXCHANGE_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-amt">운용 예정 자금</label>
              <select id="f-amt" name="amount" value={form.amount} onChange={set("amount")} disabled={state !== "idle"}>
                {AMOUNT_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="chk">
            <input type="checkbox" checked={form.privacy} onChange={set("privacy")} disabled={state !== "idle"} />
            <span>
              개인정보 수집·이용에 동의합니다. 수집 항목: 이름, 연락처, 거래소·자금 규모 / 목적: 체험
              안내 및 상담 / 보유 기간: 목적 달성 후 즉시 파기 <a href="#">전문 보기</a>
            </span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={form.risk} onChange={set("risk")} disabled={state !== "idle"} />
            <span>
              가상자산 선물 거래는 레버리지로 인해 단기간에 큰 손실이 발생할 수 있으며, 투자 판단과
              책임이 본인에게 있음을 확인합니다.
            </span>
          </label>

          {error ? (
            <p className="err" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={state !== "idle"}>
            {state === "sending" ? "접수 중…" : state === "done" ? "접수 완료" : "체험 신청하기"}
          </button>

          {state === "done" ? (
            <div className="done" role="status">
              신청이 접수되었습니다. 영업일 1일 이내에 담당자가 연락드리겠습니다.
            </div>
          ) : null}

          <p className="fine">
            입력하신 정보는 체험 안내 외 어떤 마케팅에도 사용하지 않습니다. 딥퀀트는 리딩방을
            운영하거나 종목 추천 문자를 보내지 않습니다.
          </p>
        </form>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="closing dark">
      <div className="wrap">
        <h2>감으로 거래하는 시대는 끝났습니다.</h2>
        <p className="sub">규칙을 지키는 것은 사람보다 코드가 잘합니다. 14일 동안 직접 확인해 보세요.</p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#apply">
            14일 무료 체험 신청
          </a>
          <a className="btn btn-ghost" href="#rules">
            리스크 규칙 다시 보기
          </a>
        </div>
      </div>
    </section>
  );
}

function RiskNotice() {
  return (
    <div className="risk-notice">
      <div className="wrap">
        <div className="box">
          <h2>투자 위험 고지</h2>
          <ol>
            {RISK_NOTICE.map((r) => (
              <li key={r.slice(0, 20)}>{r}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <strong>주식회사 딥퀀트</strong>
            대표 ○○○
            <br />
            사업자등록번호 000-00-00000
            <br />
            통신판매업신고 제0000-서울○○-0000호
            <br />
            서울특별시 ○○구 ○○로 00, 0층
          </div>
          <div>
            <strong>고객센터</strong>
            02-000-0000 (평일 10시–18시)
            <br />
            help@deepquant.ai
            <br />
            텔레그램 @deepquant_support
          </div>
          <div>
            <strong>문서</strong>
            <div className="links">
              <a href="#">이용약관</a>
              <a href="#">개인정보처리방침</a>
              <a href="#">리스크 규칙 계약서 샘플</a>
              <a href="#">API 연동 가이드</a>
            </div>
          </div>
        </div>
        <div className="copy">
          © 2026 DeepQuant Inc. 딥퀀트는 금융회사 또는 가상자산사업자(VASP)가 아니며, 가상자산의
          매매·중개·보관 서비스를 제공하지 않습니다.
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ───────────────────────────────────
export default function DeepQuantPage() {
  return (
    <>
      <Head>
        <title>{SITE.title}</title>
        <meta name="description" content={SITE.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index,follow" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE.name} />
        <meta property="og:title" content={SITE.title} />
        <meta property="og:description" content={SITE.description} />
        <meta property="og:url" content={SITE.url} />
        <meta property="og:locale" content="ko_KR" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/svg+xml" href="/deepquant-icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/*
          globals.css 가 html/body 를 어두운 오일 대시보드 테마로 고정한다.
          이 페이지에서만 되돌려야 하므로 :root 로 특이도를 올려 SSR 단계에서 덮어쓴다.
          (Head 는 서버 렌더링되므로 첫 페인트부터 적용되고, 페이지를 떠나면 제거된다)
        */}
        <style>{`
:root{scroll-behavior:smooth}
:root,:root body{background:#F6F7F9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]),:root:not([data-theme="light"]) body{background:#0B1424}}
:root[data-theme="dark"],:root[data-theme="dark"] body{background:#0B1424}
@media (prefers-reduced-motion:reduce){:root{scroll-behavior:auto}}
`}</style>
      </Head>

      <div className="dq">
        <SiteHeader />
        <Hero />
        <Ticker />
        <ConsoleBand />
        <Stats />
        <Focus />
        <Pipeline />
        <Rules />
        <TrackRecord />
        <Custody />
        <Team />
        <Pricing />
        <Faq />
        <Apply />
        <Closing />
        <RiskNotice />
        <SiteFooter />
      </div>
    </>
  );
}
