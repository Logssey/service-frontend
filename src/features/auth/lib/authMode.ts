/**
 * 인증 계층의 동작 모드.
 *
 * 스위치가 둘로 나뉘어 있어야 "카카오 앱 키는 없지만 백엔드 인증은 실제로 쓴다"는
 * 조합을 표현할 수 있다. 지금 로컬 개발이 정확히 그 상태다.
 *
 * - `usesAuthMocks` — 인증 API를 목으로 처리할지. 전역 `VITE_USE_MOCKS`를 false로 내리면
 *   아직 백엔드에 없는 개발자 A의 API까지 실제 호출로 바뀌어 화면이 전부 깨진다.
 *   그래서 인증에만 적용되는 `VITE_USE_MOCKS_AUTH`를 두고, 없으면 전역 값을 따른다.
 * - `usesKakaoStub` — 브라우저가 카카오로 나가지 않고 콜백으로 바로 돌아올지.
 *   백엔드 `local` 프로파일의 `app.kakao.stub=true`와 짝을 이룬다. 대역이 인가 코드를
 *   그대로 회원번호로 쓰므로, 코드만 브라우저마다 고정하면 같은 계정으로 계속 로그인된다.
 */
export const usesAuthMocks =
  (import.meta.env.VITE_USE_MOCKS_AUTH ?? import.meta.env.VITE_USE_MOCKS) !== 'false'

/** 목 모드에서는 카카오를 호출할 수단이 없으므로 항상 대역을 쓴다. */
export const usesKakaoStub = usesAuthMocks || import.meta.env.VITE_KAKAO_STUB === 'true'
