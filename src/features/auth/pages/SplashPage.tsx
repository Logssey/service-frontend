import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SplashScreen } from '@/features/auth/components/SplashScreen'
import { authSession } from '@/features/auth/model/authStore'
import { recoverSession } from '@/shared/api/http'

/**
 * COM-001 스플래시.
 *
 * 세션이 있으면 홈으로, 없으면 로그인으로 보낸다. 새로고침 뒤의 세션 복구는 {@link SessionBootstrap}이
 * 모든 주소에서 먼저 하므로, 여기서는 아직 토큰이 없을 때만 재발급을 시도한다.
 */
export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let canceled = false
    const restored =
      authSession.getAccessToken() !== null ? Promise.resolve(true) : recoverSession()

    void restored.then((signedIn) => {
      if (!canceled) navigate(signedIn ? '/' : '/login', { replace: true })
    })

    return () => {
      canceled = true
    }
  }, [navigate])

  return <SplashScreen />
}
