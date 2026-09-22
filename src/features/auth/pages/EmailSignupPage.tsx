import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  describePasswordProblem,
  isEmailShaped,
  isNicknameShaped,
  isPasswordAcceptable,
} from '@/features/auth/lib/passwordPolicy'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'

type CheckResult = { value: string; available: boolean } | null

/**
 * AUTH-004 이메일 회원가입.
 *
 * 화면설계서(아카이브)의 회원가입 화면을 따른다 — 프로필 사진, 이메일, 비밀번호,
 * 비밀번호 확인, 닉네임. 약관은 현행 AUTH-002와 같이 필수 2건으로 둔다.
 */
export function EmailSignupPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [emailChecked, setEmailChecked] = useState<CheckResult>(null)
  const [nicknameChecked, setNicknameChecked] = useState<CheckResult>(null)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const trimmedNickname = nickname.trim()
  // 값을 고치면 이전 중복확인 결과는 무효다
  const emailAvailable =
    emailChecked?.value === trimmedEmail ? emailChecked.available : null
  const nicknameAvailable =
    nicknameChecked?.value === trimmedNickname ? nicknameChecked.available : null

  const passwordProblem = describePasswordProblem(password)
  const confirmMismatch = passwordConfirm.length > 0 && password !== passwordConfirm

  const canSubmit =
    emailAvailable === true &&
    nicknameAvailable === true &&
    isPasswordAcceptable(password) &&
    password === passwordConfirm &&
    termsAgreed &&
    privacyAgreed &&
    !submitting

  const checkEmail = async () => {
    if (!isEmailShaped(trimmedEmail)) return
    setError(null)
    const result = await emailAuthApi.checkEmail(trimmedEmail)
    setEmailChecked({ value: trimmedEmail, available: result.available })
  }

  const checkNickname = async () => {
    if (!isNicknameShaped(trimmedNickname)) return
    setError(null)
    const result = await authApi.checkNickname(trimmedNickname)
    setNicknameChecked({ value: trimmedNickname, available: result.available })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    try {
      const session = await emailAuthApi.emailSignup(trimmedEmail, password, trimmedNickname)
      setSession(session.accessToken, session.user)
      navigate('/', { replace: true })
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '가입에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page auth-page">
      <PageHeader title="회원가입" />
      <main className="auth-shell auth-shell--form">
        <ProfileImagePicker label="프로필 사진 (선택)" />

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="signup-email">
              Email
            </label>
            <div className="field__row">
              <input
                id="signup-email"
                type="email"
                value={email}
                placeholder="이메일을 입력해 주세요"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="button button--secondary"
                type="button"
                disabled={!isEmailShaped(trimmedEmail)}
                onClick={() => void checkEmail()}
              >
                중복확인
              </button>
            </div>
            {emailAvailable === true ? (
              <p className="field-help" role="status">
                사용할 수 있는 이메일입니다
              </p>
            ) : null}
            {emailAvailable === false ? (
              <p className="field-error" role="alert">
                * 이미 가입된 이메일입니다
              </p>
            ) : null}
            {trimmedEmail.length > 0 && !isEmailShaped(trimmedEmail) ? (
              <p className="field-error" role="alert">
                * 이메일 형식이 올바르지 않습니다
              </p>
            ) : null}
          </div>

          <PasswordField
            label="Password"
            value={password}
            placeholder="8자 이상"
            autoComplete="new-password"
            onChange={setPassword}
          />
          {passwordProblem ? (
            <p className="field-error" role="alert">
              * {passwordProblem}
            </p>
          ) : null}

          <PasswordField
            label="Password Confirm"
            value={passwordConfirm}
            placeholder="재입력"
            autoComplete="new-password"
            onChange={setPasswordConfirm}
          />
          {confirmMismatch ? (
            <p className="field-error" role="alert">
              * 비밀번호가 일치하지 않습니다
            </p>
          ) : null}

          <div className="field">
            <label className="field__label" htmlFor="signup-nickname">
              Nickname
            </label>
            <div className="field__row">
              <input
                id="signup-nickname"
                value={nickname}
                placeholder={`${NICKNAME_MIN}~${NICKNAME_MAX}자`}
                autoComplete="off"
                maxLength={NICKNAME_MAX}
                onChange={(event) => setNickname(event.target.value)}
              />
              <button
                className="button button--secondary"
                type="button"
                disabled={!isNicknameShaped(trimmedNickname)}
                onClick={() => void checkNickname()}
              >
                중복확인
              </button>
            </div>
            {nicknameAvailable === true ? (
              <p className="field-help" role="status">
                사용할 수 있는 닉네임입니다
              </p>
            ) : null}
            {nicknameAvailable === false ? (
              <p className="field-error" role="alert">
                * 이미 사용 중인 닉네임입니다
              </p>
            ) : null}
          </div>

          <fieldset className="field">
            <legend className="field__label">약관 동의</legend>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(event) => setTermsAgreed(event.target.checked)}
              />
              <span>[필수] 서비스 이용약관 동의</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(event) => setPrivacyAgreed(event.target.checked)}
              />
              <span>[필수] 개인정보 처리방침 동의</span>
            </label>
          </fieldset>

          {error ? (
            <p className="field-error" role="alert">
              * {error}
            </p>
          ) : null}

          <button className="button button--primary" type="submit" disabled={!canSubmit}>
            {submitting ? '가입 중…' : 'Sign Up'}
          </button>
        </form>
      </main>
    </div>
  )
}
