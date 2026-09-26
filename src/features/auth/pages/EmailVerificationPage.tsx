import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'

type Phase = 'loading' | 'pending' | 'verified'

/**
 * 이메일 소유 확인(FR-AUTH-014, FR-AUTH-017).
 *
 * 대상은 인증 수단에 이메일이 등록된 계정이다. 이메일 가입(LOCAL)은 항상, 소셜 계정은 온보딩에서
 * 이메일을 입력한 경우다(ADR-019). 이메일이 없는 계정은 확인할 것이 없으므로 홈으로 보낸다.
 * 가입 직후 서버가 코드를 1회 보내므로 이 화면은 코드 입력과 재발송만 담당한다.
 * 확인 전에도 서비스 이용을 제한하지 않으므로 "나중에 하기"로 건너뛸 수 있다(이메일 가입 명세).
 * 재발송은 60초 간격·시간당 5회, 코드 검증은 코드당 5회로 제한되며 초과 시 429다.
 * 같은 주소가 다른 소셜 계정에서 이미 인증되어 있으면 확인은 409다.
 */
export function EmailVerificationPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 등록된 이메일과 확인 여부는 본인 정보에서만 알 수 있다(내 정보 조회 명세).
  // 확인 대상은 provider가 아니라 이메일 유무로 가린다 — 이메일을 입력한 소셜 계정도 대상이다.
  // 그래서 로그인이 필요하면 이메일 전용 화면이 아니라 카카오 로그인도 있는 기본 로그인 화면으로 보낸다.
  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true, state: { message: '로그인이 필요합니다.' } })
      return
    }

    let canceled = false
    authApi
      .me()
      .then((profile) => {
        if (canceled) return
        if (profile.email === null) {
          navigate('/', { replace: true })
          return
        }
        setEmail(profile.email)
        setPhase(profile.emailVerified ? 'verified' : 'pending')
      })
      .catch(() => {
        if (canceled) return
        navigate('/login', { replace: true, state: { message: '로그인이 필요합니다.' } })
      })

    return () => {
      canceled = true
    }
  }, [accessToken, navigate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (code.length !== 6 || submitting) return

    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await emailAuthApi.confirmVerification({ code })
      setPhase('verified')
    } catch (cause: unknown) {
      if (cause instanceof ApiClientError && cause.status === 409) {
        // 코드는 맞았지만 같은 주소가 다른 계정에서 이미 인증되어 있다(ADR-019). 서버는 코드를
        // 소비하지 않지만 다시 제출해도 결과가 같으므로 입력을 비운다.
        setCode('')
        setError(cause.message || '이미 다른 계정에서 인증된 이메일입니다.')
        return
      }
      setError(cause instanceof ApiClientError ? cause.message : '확인에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    if (resending) return
    setResending(true)
    setError(null)
    setNotice(null)
    try {
      await emailAuthApi.resendVerification()
      setCode('')
      setNotice('인증코드를 다시 보냈습니다. 메일함을 확인해 주세요.')
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '재발송에 실패했습니다.')
    } finally {
      setResending(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="app-page auth-page">
        <main className="auth-shell">
          <div className="state-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>확인 중…</p>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'verified') {
    return (
      <div className="app-page auth-page">
        <PageHeader title="이메일 인증" />
        <main className="auth-shell auth-shell--form">
          <div className="auth-heading">
            <h1>이메일 인증이 완료되었습니다</h1>
            <p>이제 모든 기능을 이용할 수 있어요.</p>
          </div>
          <Link className="button button--primary" to="/" replace>
            홈으로
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="app-page auth-page">
      <PageHeader title="이메일 인증" />
      <main className="auth-shell auth-shell--form">
        <div className="auth-heading">
          <h1>메일로 보낸 인증코드를 입력해 주세요</h1>
          <p>{email} 주소로 6자리 코드를 보냈습니다. 10분 안에 입력해 주세요.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="verify-code">
              인증코드
            </label>
            <div className="field__row">
              <input
                id="verify-code"
                value={code}
                placeholder="6자리 숫자"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
              <button
                className="button button--secondary"
                type="button"
                disabled={resending}
                onClick={() => void resend()}
              >
                {resending ? '발송 중…' : '다시 보내기'}
              </button>
            </div>
            {notice ? (
              <p className="field-help" role="status">
                {notice}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="field-error" role="alert">
              * {error}
            </p>
          ) : null}

          <button
            className="button button--primary"
            type="submit"
            disabled={code.length !== 6 || submitting}
          >
            {submitting ? '확인 중…' : '인증하기'}
          </button>

          <div className="auth-links">
            <Link to="/" replace>
              나중에 하기
            </Link>
          </div>
        </form>

        <p className="auth-terms">인증 전에도 서비스를 이용할 수 있습니다</p>
      </main>
    </div>
  )
}
