/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCKS?: string
  /** 인증만 실제 백엔드에 붙일 때 'false'. 없으면 VITE_USE_MOCKS를 따른다. */
  readonly VITE_USE_MOCKS_AUTH?: string
  /** 카카오 앱 키 없이 로그인 흐름을 돌릴 때 'true'. 백엔드 app.kakao.stub과 짝을 이룬다. */
  readonly VITE_KAKAO_STUB?: string
  /** 카카오 REST API 키. 인가 코드 방식은 JavaScript 키가 아니라 REST API 키를 쓴다. */
  readonly VITE_KAKAO_CLIENT_ID?: string
  readonly VITE_KAKAO_REDIRECT_URI?: string
  /** 채팅 실시간 수신을 켤 때 'true'. 목 모드에서는 쓰지 않는다. */
  readonly VITE_CHAT_REALTIME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
