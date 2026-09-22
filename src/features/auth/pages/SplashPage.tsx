import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/model/authStore'

/**
 * COM-001 스플래시.
 *
 * Access Token은 메모리에만 있어 새로고침하면 사라진다. 진입 시 Refresh Token 쿠키로
 * 재발급을 시도해 유효하면 홈으로, 없거나 만료면 로그인으로 보낸다.
 */
export function SplashPage() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  useEffect(() => {
    let canceled = false

    authApi
      .refresh()
      .then((response) => {
        if (canceled) return
        setAccessToken(response.accessToken)
        navigate('/', { replace: true })
      })
      .catch(() => {
        if (canceled) return
        navigate('/login', { replace: true })
      })

    return () => {
      canceled = true
    }
  }, [navigate, setAccessToken])

  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="brand brand--splash">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <div>
            <strong>Re:Used</strong>
            <p>다시 쓰는 좋은 물건</p>
          </div>
        </div>
        <div className="state-panel" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>로딩 중…</p>
        </div>
      </main>
    </div>
  )
}
