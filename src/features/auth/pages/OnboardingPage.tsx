import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'

const NICKNAME_MIN = 2
const NICKNAME_MAX = 20

/**
 * AUTH-002 온보딩(닉네임 설정).
 *
 * 카카오에서 이메일·비밀번호를 받지 않으므로 가입에 필요한 입력은 닉네임과 약관 동의뿐이다(ADR-004).
 * 닉네임은 2~20자이고 중복이면 409다. 필수 약관 2건에 모두 동의해야 제출할 수 있다.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const signupToken = useAuthStore((state) => state.signupToken)
  const setSession = useAuthStore((state) => state.setSession)

  const [nickname, setNickname] = useState('')
  const [checked, setChecked] = useState<{ nickname: string; available: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const canSubmit = lengthValid && confirmed === true && termsAgreed && privacyAgreed

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
      const session = await authApi.signup(signupToken, trimmed, true)
      completed.current = true
      setSession(session.accessToken, session.user)
      navigate('/', { replace: true })
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

        <ProfileImagePicker label="프로필 이미지 (선택)" />

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
