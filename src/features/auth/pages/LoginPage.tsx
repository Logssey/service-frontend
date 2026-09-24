import { MessageCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  buildKakaoAuthorizeUrl,
  buildStubCallbackPath,
  usesKakaoStub,
} from '@/features/auth/lib/kakao'
/** AUTH-001: 카카오 간편 로그인 진입 화면. */
export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const handedOverMessage = (location.state as { message?: string } | null)?.message

  const startKakaoLogin = () => {
    if (usesKakaoStub) {
      navigate(buildStubCallbackPath(), { replace: true })
      return
    }
    window.location.href = buildKakaoAuthorizeUrl()
  }

  return (
    <div className="app-page auth-page">
      <main className="auth-shell auth-shell--login">
        <div className="brand brand--splash">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <div>
            <h1>Re:Used</h1>
            <p>믿을 수 있는 중고거래</p>
          </div>
        </div>

        {handedOverMessage ? (
          <p className="auth-alert" role="alert">
            {handedOverMessage}
          </p>
        ) : null}

        <button className="button button--kakao" type="button" onClick={startKakaoLogin}>
          <MessageCircle size={18} aria-hidden="true" />
          카카오로 시작하기
        </button>
      </main>
    </div>
  )
}
