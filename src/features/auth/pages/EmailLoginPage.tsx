import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { isEmailShaped } from '@/features/auth/lib/passwordPolicy'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'

/** 기존 이메일 계정용 직접 주소. 기본 로그인 화면에서도 같은 계정 로그인을 제공한다. */
export function EmailLoginPage() {
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

  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="brand brand--splash">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <div>
            <h1>Re:Used</h1>
            <p>이메일로 로그인</p>
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
              이메일
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
            label="비밀번호"
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
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <div className="auth-links">
            <Link to="/signup/email">회원가입</Link>
            <Link to="/password/reset">비밀번호 재설정</Link>
          </div>
        </form>
      </main>
    </div>
  )
}
