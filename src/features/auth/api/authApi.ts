import { usesAuthMocks } from '@/features/auth/lib/authMode'
import type {
  AccessTokenResponse,
  AuthTokenResponse,
  KakaoLoginResponse,
  NicknameAvailabilityResponse,
} from '@/features/auth/model/types'
import { mockAuthRepository } from '@/mocks/authRepository'
import { apiRequest } from '@/shared/api/http'

export const authApi = {
  /** AUTH-001 · POST /auth/kakao */
  async kakaoLogin(code: string, redirectUri: string): Promise<KakaoLoginResponse> {
    if (usesAuthMocks) return mockAuthRepository.kakaoLogin(code)

    return apiRequest<KakaoLoginResponse>(
      '/auth/kakao',
      { method: 'POST', body: JSON.stringify({ code, redirectUri }) },
      { skipAuthRecovery: true },
    )
  },

  /** AUTH-002 · POST /auth/signup */
  async signup(
    signupToken: string,
    nickname: string,
    termsAgreed: boolean,
  ): Promise<AuthTokenResponse> {
    if (usesAuthMocks) return mockAuthRepository.signup(signupToken, nickname)

    return apiRequest<AuthTokenResponse>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify({ signupToken, nickname, termsAgreed }) },
      { skipAuthRecovery: true },
    )
  },

  /** COM-001 · POST /auth/refresh — Refresh Token 쿠키로 세션을 복구한다. */
  async refresh(): Promise<AccessTokenResponse> {
    if (usesAuthMocks) return mockAuthRepository.refresh()

    // 재발급 자체가 401이면 복구할 방법이 없으므로 재시도 경로를 타지 않는다
    return apiRequest<AccessTokenResponse>(
      '/auth/refresh',
      { method: 'POST' },
      { skipAuthRecovery: true },
    )
  },

  /** POST /auth/logout */
  async logout(): Promise<void> {
    if (usesAuthMocks) return mockAuthRepository.logout()
    return apiRequest<void>('/auth/logout', { method: 'POST' })
  },

  /** AUTH-002 중복확인 · GET /users/nickname/check */
  async checkNickname(nickname: string): Promise<NicknameAvailabilityResponse> {
    if (usesAuthMocks) return mockAuthRepository.checkNickname(nickname)

    // Tomcat이 인코딩되지 않은 한글 쿼리 파라미터를 400으로 거부한다
    return apiRequest<NicknameAvailabilityResponse>(
      `/users/nickname/check?nickname=${encodeURIComponent(nickname)}`,
    )
  },
}
