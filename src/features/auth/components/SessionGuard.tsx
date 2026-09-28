import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { SplashScreen } from '@/features/auth/components/SplashScreen'
import { usesAuthMocks } from '@/features/auth/lib/authMode'
import { authSession, useAuthStore } from '@/features/auth/model/authStore'
import { recoverSession } from '@/shared/api/http'

// 목 모드는 백엔드 없이 화면을 둘러보는 데모라 로그인을 강제하지 않는다
const sessionEnforced = !usesAuthMocks

/**
 * COM-001. Access Token은 메모리에만 있어 새로고침하면 사라진다(api-spec §0.4).
 *
 * 앱을 처음 그릴 때 Refresh Token 쿠키로 한 번 재발급해, 어느 주소로 들어와도 세션을 되살린다.
 * 공개 화면도 기다린다. 로그인 여부에 따라 찜·내 글 표시와 차단 필터가 달라진다.
 */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(
    () => !sessionEnforced || authSession.getAccessToken() !== null,
  )

  useEffect(() => {
    if (ready) return
    let canceled = false
    // StrictMode가 효과를 두 번 돌려도 재발급 요청은 하나다(recoverSession)
    void recoverSession().finally(() => {
      if (!canceled) setReady(true)
    })
    return () => {
      canceled = true
    }
  }, [ready])

  return ready ? children : <SplashScreen />
}

/**
 * 로그인이 필요한 화면을 감싼다. 세션이 없으면 AUTH-001로 보낸다(my-account.md MY-001).
 * 로그아웃·탈퇴·재발급 실패로 세션이 비면 그 자리에서 바로 로그인으로 나간다.
 */
export function RequireSession() {
  const signedIn = useAuthStore((state) => state.accessToken !== null)

  if (!sessionEnforced || signedIn) return <Outlet />
  return <Navigate to="/login" replace state={{ message: '로그인이 필요합니다.' }} />
}
