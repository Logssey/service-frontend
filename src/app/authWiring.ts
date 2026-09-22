import { authApi } from '@/features/auth/api/authApi'
import { authSession } from '@/features/auth/model/authStore'
import { configureAccessTokenProvider, configureUnauthorizedRecovery } from '@/shared/api/http'

/**
 * 개발자 A가 shared/api/http.ts에 남긴 인증 경계에 실제 구현을 연결한다.
 *
 * 이 모듈은 App.tsx가 부수효과로 import한다. import가 빠지면 모든 요청이 토큰 없이 나가므로
 * 라우트를 건드릴 때 함께 사라지지 않도록 주의한다.
 */
configureAccessTokenProvider(() => authSession.getAccessToken())

configureUnauthorizedRecovery(async () => {
  try {
    const reissued = await authApi.refresh()
    authSession.setAccessToken(reissued.accessToken)
    return true
  } catch {
    authSession.clear()
    return false
  }
})
