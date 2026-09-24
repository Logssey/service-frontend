import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { consumeState, getRedirectUri } from '@/features/auth/lib/kakao'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'

/**
 * 카카오 인가 코드 콜백.
 *
 * 화면설계서에 독립 화면이 없지만 AUTH-001에서 AUTH-002와 홈으로 갈라지는 지점이라
 * 라우트가 필요하다. 인가 코드는 일회용이므로 StrictMode의 이중 실행으로 두 번 보내지 않게 막는다.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const setSignupToken = useAuthStore((state) => state.setSignupToken)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    const code = searchParams.get('code')
    const returnedState = searchParams.get('state')
    const expectedState = consumeState()

    if (!code) {
      const reason = searchParams.get('error_description') ?? '로그인이 취소되었습니다.'
      navigate('/login', { replace: true, state: { message: reason } })
      return
    }
    if (expectedState && returnedState !== expectedState) {
      navigate('/login', {
        replace: true,
        state: { message: '로그인 요청이 올바르지 않습니다. 다시 시도해 주세요.' },
      })
      return
    }

    authApi
      .oauthLogin('kakao', { code, redirectUri: getRedirectUri() })
      .then((response) => {
        if (response.status === 'SIGNUP_REQUIRED' && response.signupToken) {
          setSignupToken(response.signupToken)
          navigate('/onboarding', { replace: true })
          return
        }
        if (response.accessToken) {
          setSession(response.accessToken, response.user)
          navigate('/', { replace: true })
          return
        }
        navigate('/login', { replace: true, state: { message: '로그인에 실패했습니다.' } })
      })
      .catch((cause: unknown) => {
        const message =
          cause instanceof ApiClientError
            ? cause.message
            : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        navigate('/login', { replace: true, state: { message } })
      })
  }, [navigate, searchParams, setSession, setSignupToken])

  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="state-panel" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>로그인 중…</p>
        </div>
      </main>
    </div>
  )
}
