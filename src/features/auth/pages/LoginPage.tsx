import { MessageCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { usesAuthMocks } from '@/features/auth/lib/authMode'
import {
  buildKakaoAuthorizeUrl,
  buildStubCallbackPath,
  resetStubAccount,
  usesKakaoStub,
} from '@/features/auth/lib/kakao'
import { isEmailShaped } from '@/features/auth/lib/passwordPolicy'
import { useAuthStore } from '@/features/auth/model/authStore'
import { mockAuthRepository } from '@/mocks/authRepository'
import { ApiClientError } from '@/shared/api/http'

/**
 * AUTH-001 로그인.
 *
 * 화면설계서에 맞춰 이메일·비밀번호 로그인과 카카오 간편 로그인을 함께 둔다.
 * 아카이브 화면에는 Google도 있었으나 ADR-004가 Kakao 단독으로 한정해 넣지 않았다.
 */
export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const handedOverMessage = (location.state as { message?: string } | null)?.message

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = isEmailShaped(email) && password.length > 0 && !submitting

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    try {
      const session = await emailAuthApi.emailLogin({ email: email.trim(), password })
      setSession(session.accessToken, session.user)
      navigate('/', { replace: true })
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      )
      setSubmitting(false)
    }
  }

  const startKakaoLogin = () => {
    if (usesKakaoStub) {
      navigate(buildStubCallbackPath(), { replace: true })
      return
    }
    window.location.href = buildKakaoAuthorizeUrl()
  }

  /**
   * 인가 코드를 새로 뽑아 미가입자로 되돌린다. 실제 백엔드에 붙어 있어도 유효한데,
   * 대역이 인가 코드를 그대로 회원번호로 쓰므로 코드가 바뀌면 처음 보는 회원이 된다.
   */
  const startAsNewMember = () => {
    resetStubAccount()
    if (usesAuthMocks) mockAuthRepository.reset()
    navigate(buildStubCallbackPath(), { replace: true })
  }

  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="brand brand--splash">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <div>
            <strong>Re:Used</strong>
            <p>믿을 수 있는 중고거래</p>
          </div>
        </div>

        {handedOverMessage ? (
          <p className="auth-alert" role="alert">
            {handedOverMessage}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              placeholder="이메일을 입력해 주세요"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <PasswordField
            label="Password"
            value={password}
            placeholder="비밀번호를 입력해 주세요"
            autoComplete="current-password"
            onChange={setPassword}
          />

          {error ? (
            <p className="field-error" role="alert">
              * {error}
            </p>
          ) : null}

          <button className="button button--primary" type="submit" disabled={!canSubmit}>
            {submitting ? '로그인 중…' : 'Log In'}
          </button>

          <div className="auth-links">
            <Link to="/signup/email">Sign Up →</Link>
            <Link to="/password/reset">비밀번호 재설정</Link>
          </div>
        </form>

        <div className="auth-divider">
          <span>또는 간편 로그인</span>
        </div>

        <button className="button button--kakao" type="button" onClick={startKakaoLogin}>
          <MessageCircle size={18} aria-hidden="true" />
          Kakao로 계속하기
        </button>

        {usesKakaoStub ? (
          <div className="dev-notice">
            <p>대역 모드 · 카카오를 호출하지 않습니다</p>
            <button className="button button--secondary" type="button" onClick={startAsNewMember}>
              신규 회원으로 가입 흐름 보기
            </button>
          </div>
        ) : null}

        {usesAuthMocks ? (
          <div className="dev-notice">
            <p>목 계정 · test@reused.dev / test1234</p>
          </div>
        ) : null}

        <p className="auth-terms">
          로그인 시 서비스 이용약관과
          <br />
          개인정보 처리방침에 동의하게 됩니다
        </p>
      </main>
    </div>
  )
}
