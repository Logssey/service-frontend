import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'
import { deleteProfileUpload, uploadProfileImage } from '@/features/auth/api/profileImageApi'
import {
  EMAIL_MAX,
  NICKNAME_MAX,
  NICKNAME_MIN,
  isEmailShaped,
} from '@/features/auth/lib/passwordPolicy'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'

/**
 * AUTH-002 온보딩(닉네임 설정).
 *
 * 카카오에는 이메일을 요청하지 않는다. 가입에 필요한 입력은 닉네임과 필수 약관 동의뿐이고
 * 이메일은 사용자가 선택 입력한다(ADR-004, ADR-016). 닉네임은 2~20자이고 중복이면 409다.
 * 필수 약관 2건에 모두 동의해야 제출할 수 있다.
 *
 * 이메일을 입력하면 별도의 [선택] 수집·이용 동의가 있어야 제출할 수 있고, 가입 직후 서버가 보낸
 * 소유 확인 코드를 입력하는 화면으로 간다. 입력 단계에서는 이메일 중복을 검사하지 않는다 — 확인 전
 * 주소는 선점할 수 없고 가입 여부도 드러나지 않아야 한다. 소셜 계정의 이메일은 연락 수단이라
 * 로그인·비밀번호 재설정에 쓰이지 않는다.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const signupToken = useAuthStore((state) => state.signupToken)
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)

  const [nickname, setNickname] = useState('')
  const [checked, setChecked] = useState<{ nickname: string; available: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const [email, setEmail] = useState('')
  const [emailAgreed, setEmailAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imageWarning, setImageWarning] = useState<string | null>(null)
  // 가입에 성공하면 signupToken이 비워진다. 그것을 "토큰 없이 진입"으로 오해하면
  // 홈으로 가려는 순간 로그인 화면으로 튕겨낸다.
  const completed = useRef(false)

  // 가입 토큰 없이 들어온 경우 — 직접 URL을 입력했거나 토큰이 만료됐다
  useEffect(() => {
    if (completed.current) return
    if (!signupToken) {
      navigate('/login', {
        replace: true,
        state: { message: '가입 절차가 만료되었습니다. 다시 로그인해 주세요.' },
      })
    }
  }, [navigate, signupToken])

  const trimmed = nickname.trim()
  const lengthValid = trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX
  // 닉네임을 고치면 이전 중복확인 결과는 무효다
  const confirmed = checked?.nickname === trimmed ? checked.available : null

  // 이메일은 선택이다. 비워 두면 선택 동의와 함께 무시하고, 입력했다면 형식과 동의가 모두 필요하다
  const trimmedEmail = email.trim()
  const emailEntered = trimmedEmail.length > 0
  const emailShaped = isEmailShaped(trimmedEmail)
  const emailReady = !emailEntered || (emailShaped && emailAgreed)

  const canSubmit =
    lengthValid && confirmed === true && emailReady && termsAgreed && privacyAgreed

  const runCheck = async () => {
    if (!lengthValid || checking) return
    setChecking(true)
    setError(null)
    try {
      const result = await authApi.checkNickname(trimmed)
      setChecked({ nickname: trimmed, available: result.available })
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiClientError ? cause.message : '중복확인에 실패했습니다.',
      )
    } finally {
      setChecking(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || !signupToken || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const session = await authApi.signup({
        signupToken,
        nickname: trimmed,
        // 비어 있으면 이메일과 선택 동의를 모두 보내지 않는다
        ...(emailEntered ? { email: trimmedEmail, emailCollectionAgreed: emailAgreed } : {}),
        termsOfServiceAgreed: termsAgreed,
        privacyPolicyAgreed: privacyAgreed,
      })
      completed.current = true
      setSession(session.accessToken, session.user)
      if (profileImage) {
        let imageId: number | null = null
        try {
          imageId = await uploadProfileImage(profileImage)
          const profile = await authApi.updateProfile({ imageId })
          setUser({ userId: profile.userId, nickname: profile.nickname, profileImageUrl: profile.profileImageUrl })
        } catch {
          if (imageId !== null) await deleteProfileUpload(imageId).catch(() => {})
          setImageWarning('계정은 생성됐지만 프로필 이미지를 저장하지 못했습니다. 내 정보에서 다시 등록해 주세요.')
          return
        }
      }
      // 이메일을 입력했으면 소유 확인 메일이 발송되어 있다. 확인은 건너뛸 수 있다.
      navigate(emailEntered ? '/verify-email' : '/', { replace: true })
    } catch (cause: unknown) {
      if (cause instanceof ApiClientError && cause.status === 409) {
        setChecked({ nickname: trimmed, available: false })
      }
      setError(cause instanceof ApiClientError ? cause.message : '가입에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="auth-heading">
          <span className="eyebrow">프로필 설정</span>
          <h1>사용할 닉네임을 정해 주세요</h1>
          <p>거래 상대에게 보이는 이름입니다. 나중에 바꿀 수 있어요.</p>
        </div>

        <ProfileImagePicker label="프로필 이미지 (선택)" value={profileImage} onChange={setProfileImage} disabled={submitting} />

        {imageWarning ? (
          <div className="auth-alert" role="alert">
            <p>{imageWarning}</p>
            <button type="button" className="button button--secondary" onClick={() => navigate(emailEntered ? '/verify-email' : '/', { replace: true })}>
              계속하기
            </button>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="nickname">
              닉네임
            </label>
            <div className="field__row">
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={NICKNAME_MAX}
                placeholder={`${NICKNAME_MIN}~${NICKNAME_MAX}자`}
                autoComplete="off"
              />
              <button
                className="button button--secondary"
                type="button"
                disabled={!lengthValid || checking}
                onClick={() => void runCheck()}
              >
                {checking ? '확인 중…' : '중복확인'}
              </button>
            </div>

            {confirmed === true ? (
              <p className="field-help" role="status">
                사용할 수 있는 닉네임입니다
              </p>
            ) : null}
            {confirmed === false ? (
              <p className="field-error" role="alert">
                * 이미 사용 중인 닉네임입니다
              </p>
            ) : null}
            {trimmed.length > 0 && !lengthValid ? (
              <p className="field-error" role="alert">
                * 닉네임은 {NICKNAME_MIN}~{NICKNAME_MAX}자로 입력해 주세요
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="onboarding-email">
              이메일 (선택)
            </label>
            <input
              id="onboarding-email"
              type="email"
              value={email}
              placeholder="이메일을 입력해 주세요"
              autoComplete="email"
              maxLength={EMAIL_MAX}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="field-help">
              입력하면 소유 확인 코드를 보내드려요. 로그인은 계속 카카오로 하며, 이 이메일로 로그인하거나
              비밀번호를 재설정할 수는 없어요.
            </p>
            {emailEntered && !emailShaped ? (
              <p className="field-error" role="alert">
                * 이메일 형식이 올바르지 않습니다
              </p>
            ) : null}

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={emailAgreed}
                onChange={(event) => setEmailAgreed(event.target.checked)}
              />
              <span>[선택] 이메일 수집·이용 동의</span>
            </label>
            <p className="field-help">
              소유 확인된 연락 수단으로 서비스 안내를 받기 위해 이메일을 수집하며, 탈퇴하면 함께
              삭제됩니다. 동의하지 않아도 가입할 수 있고, 이메일을 입력했다면 동의가 필요해요.
            </p>
            {emailEntered && emailShaped && !emailAgreed ? (
              <p className="field-error" role="alert">
                * 이메일을 등록하려면 이메일 수집·이용에 동의해 주세요
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

          <button className="button button--primary" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? '가입 중…' : '시작하기'}
          </button>
        </form>
      </main>
    </div>
  )
}
