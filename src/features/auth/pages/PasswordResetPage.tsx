import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import {
  describePasswordProblem,
  isEmailShaped,
  isPasswordAcceptable,
} from '@/features/auth/lib/passwordPolicy'
import { ApiClientError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'

/**
 * AUTH-003 비밀번호 재설정.
 *
 * ① 이메일로 코드 발송 ② 코드는 10분 유효·1회 사용 ③ 변경 후 전 세션 만료(비밀번호 재설정 명세).
 * 발송 요청은 계정 유무와 무관하게 성공하므로 화면도 "보냈다"고만 말한다(NFR-AUTH-018).
 * 코드는 메일 본문에만 있다 — 목 모드에서는 브라우저 콘솔에 찍힌다.
 */
export function PasswordResetPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordProblem = describePasswordProblem(newPassword)
  const confirmMismatch = newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm

  const canSubmit =
    isEmailShaped(email) &&
    code.trim().length === 6 &&
    isPasswordAcceptable(newPassword) &&
    newPassword === newPasswordConfirm &&
    !submitting

  const sendCode = async () => {
    if (!isEmailShaped(email) || sending) return
    setSending(true)
    setError(null)
    try {
      await emailAuthApi.requestPasswordReset({ email: email.trim() })
      setSent(true)
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    try {
      await emailAuthApi.confirmPasswordReset({ email: email.trim(), code: code.trim(), newPassword })
      navigate('/login', {
        replace: true,
        state: { message: '비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.' },
      })
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '변경에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page auth-page">
      <PageHeader title="비밀번호 재설정" />
      <main className="auth-shell auth-shell--form">
        <p className="auth-lead">가입한 이메일로 인증코드를 보냅니다.</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="reset-email">
              Email
            </label>
            <div className="field__row">
              <input
                id="reset-email"
                type="email"
                value={email}
                placeholder="이메일 입력"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="button button--secondary"
                type="button"
                disabled={!isEmailShaped(email) || sending}
                onClick={() => void sendCode()}
              >
                {sending ? '발송 중…' : sent ? '다시 보내기' : '인증코드 보내기'}
              </button>
            </div>
            {sent ? (
              <p className="field-help" role="status">
                인증코드를 보냈습니다. 메일함을 확인해 주세요. (10분 유효, 1회 사용)
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="reset-code">
              인증코드
            </label>
            <input
              id="reset-code"
              value={code}
              placeholder="6자리 숫자"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </div>

          <PasswordField
            label="새 비밀번호"
            value={newPassword}
            placeholder="8자 이상"
            autoComplete="new-password"
            onChange={setNewPassword}
          />
          {passwordProblem ? (
            <p className="field-error" role="alert">
              * {passwordProblem}
            </p>
          ) : null}

          <PasswordField
            label="새 비밀번호 확인"
            value={newPasswordConfirm}
            placeholder="재입력"
            autoComplete="new-password"
            onChange={setNewPasswordConfirm}
          />
          {confirmMismatch ? (
            <p className="field-error" role="alert">
              * 비밀번호가 일치하지 않습니다
            </p>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              * {error}
            </p>
          ) : null}

          <button className="button button--primary" type="submit" disabled={!canSubmit}>
            {submitting ? '변경 중…' : '변경하기'}
          </button>

          <p className="auth-terms">비밀번호를 바꾸면 기존 로그인 세션이 모두 만료됩니다</p>
        </form>
      </main>
    </div>
  )
}
