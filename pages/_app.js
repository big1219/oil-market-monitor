import "../styles/globals.css";
// /deepquant 전용 스타일. Pages Router 는 전역 CSS 를 _app 에서만 import 할 수 있어
// 여기서 불러오고, 규칙은 모두 .dq 래퍼 아래로 스코프해 다른 페이지에 새지 않게 한다.
import "../styles/deepquant.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
