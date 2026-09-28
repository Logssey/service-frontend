import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { emailAuthApi } from '@/features/auth/api/emailAuthApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'
import { deleteProfileUpload, uploadProfileImage } from '@/features/auth/api/profileImageApi'
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
 * 입력은 프로필 사진(선택), 이메일, 비밀번호, 비밀번호 확인, 닉네임, 필수 약관 2건이다.
 * 이메일에는 중복확인 버튼을 두지 않는다 — 가입 여부가 드러나면 NFR-AUTH-018과 충돌하므로
 * 이메일 중복은 가입 요청의 409로만 알린다(닉네임 중복 확인 명세). 닉네임은 공개 값이라 확인할 수 있다.
 */
export function EmailSignupPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameChecked, setNicknameChecked] = useState<CheckResult>(null)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imageWarning, setImageWarning] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const trimmedNickname = nickname.trim()
  // 값을 고치면 이전 중복확인 결과는 무효다
  const nicknameAvailable =
    nicknameChecked?.value === trimmedNickname ? nicknameChecked.available : null

  const passwordProblem = describePasswordProblem(password)
  const confirmMismatch = passwordConfirm.length > 0 && password !== passwordConfirm

  const canSubmit =
    isEmailShaped(trimmedEmail) &&
    nicknameAvailable === true &&
    isPasswordAcceptable(password) &&
    password === passwordConfirm &&
    termsAgreed &&
    privacyAgreed &&
    !submitting

  const checkNickname = async () => {
    if (!isNicknameShaped(trimmedNickname)) return
    setError(null)
    try {
      const result = await authApi.checkNickname(trimmedNickname)
      setNicknameChecked({ value: trimmedNickname, available: result.available })
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '중복확인에 실패했습니다.')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    try {
      const session = await emailAuthApi.emailSignup({
        email: trimmedEmail,
        password,
        nickname: trimmedNickname,
        termsOfServiceAgreed: termsAgreed,
        privacyPolicyAgreed: privacyAgreed,
      })
      setSession(session.accessToken, session.user)
      if (profileImage) {
        let imageId: number | null = null
        try {
          imageId = await uploadProfileImage(profileImage)
          const profile = await authApi.updateProfile({ imageId })
          setUser({ userId: profile.userId, nickname: profile.nickname, profileImageUrl: profile.profileImageUrl })
        } catch {
          if (imageId !== null) await deleteProfileUpload(imageId).catch(() => {})
          setImageWarning('계정은 생성됐지만 프로필 사진을 저장하지 못했습니다. 내 정보에서 다시 등록해 주세요.')
          return
        }
      }
      // 가입 직후 로그인 상태이며 소유 확인 메일이 발송되어 있다. 확인은 건너뛸 수 있다.
      navigate('/verify-email', { replace: true })
    } catch (cause: unknown) {
      setError(cause instanceof ApiClientError ? cause.message : '가입에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page auth-page">
      <PageHeader title="회원가입" />
      <main className="auth-shell auth-shell--form">
        <ProfileImagePicker label="프로필 사진 (선택)" value={profileImage} onChange={setProfileImage} disabled={submitting} />

        {imageWarning ? (
          <div className="auth-alert" role="alert">
            <p>{imageWarning}</p>
            <button type="button" className="button button--secondary" onClick={() => navigate('/verify-email', { replace: true })}>
              이메일 확인으로 이동
            </button>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              placeholder="이메일을 입력해 주세요"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
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
