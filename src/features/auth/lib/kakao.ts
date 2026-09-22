import { usesKakaoStub } from '@/features/auth/lib/authMode'

/**
 * 카카오 인가 코드 요청 (ADR-004, 카카오 단독).
 *
 * KakaoLoginRequest에 state가 없지만 NFR-AUTH-005가 콜백 위조 방지를 요구하므로
 * 프론트에서 state를 만들어 sessionStorage에 두고 콜백에서 대조한다.
 * 서버가 state를 검증하지 않으므로 이 방어는 브라우저 안에서만 성립한다. 팀 확인이 필요하다.
 */
const STATE_KEY = 'kakao_oauth_state'
const STUB_ACCOUNT_KEY = 'kakao_stub_account'

export { usesKakaoStub }

export function buildKakaoAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KAKAO_CLIENT_ID ?? '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    state: issueState(),
  })
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

/** 대역 모드에서 카카오를 건너뛰고 바로 콜백으로 이동할 경로. */
export function buildStubCallbackPath(): string {
  const params = new URLSearchParams({
    code: getStubAccount(),
    state: issueState(),
  })
  return `/oauth/callback?${params.toString()}`
}

/** 인가 코드를 새로 뽑아 처음 보는 회원으로 되돌린다. */
export function resetStubAccount() {
  try {
    localStorage.removeItem(STUB_ACCOUNT_KEY)
  } catch {
    // 저장소를 쓸 수 없는 환경이면 어차피 매번 새 코드가 발급된다
  }
}

export function consumeState(): string | null {
  try {
    const state = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
    return state
  } catch {
    return null
  }
}

export function getRedirectUri(): string {
  return (
    import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/oauth/callback`
  )
}

/** 브라우저마다 고정된 값을 인가 코드 자리에 넣어 같은 계정으로 계속 로그인되게 한다. */
function getStubAccount(): string {
  try {
    const stored = localStorage.getItem(STUB_ACCOUNT_KEY)
    if (stored) return stored

    const created = `local-${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(STUB_ACCOUNT_KEY, created)
    return created
  } catch {
    return `local-${crypto.randomUUID().slice(0, 8)}`
  }
}

function issueState(): string {
  const state = crypto.randomUUID()
  try {
    sessionStorage.setItem(STATE_KEY, state)
  } catch {
    // 저장할 수 없으면 콜백에서 대조를 건너뛴다
  }
  return state
}
