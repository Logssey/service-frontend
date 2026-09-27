import { usesAuthMocks } from '@/features/auth/lib/authMode'
import type {
  AccessTokenResponse,
  AuthTokenResponse,
  MyProfileResponse,
  NicknameAvailabilityResponse,
  OAuthLoginRequest,
  OAuthLoginResponse,
  OAuthProvider,
  SignupRequest,
} from '@/features/auth/model/types'
import { mockAuthRepository } from '@/mocks/authRepository'
import { apiRequest } from '@/shared/api/http'

/**
 * 소셜 인증·세션·본인 정보 API(05-api/endpoints/auth, users).
 * 이메일 계정 전용 호출은 emailAuthApi에 있다.
 */
export const authApi = {
  /** AUTH-001 · POST /auth/oauth/{provider} — 제공자를 경로 변수로 받는다(ADR-016). */
  async oauthLogin(provider: OAuthProvider, request: OAuthLoginRequest): Promise<OAuthLoginResponse> {
    if (usesAuthMocks) return mockAuthRepository.oauthLogin(provider, request.code)

    return apiRequest<OAuthLoginResponse>(
      `/auth/oauth/${provider}`,
      { method: 'POST', body: JSON.stringify(request) },
      { skipAuthRecovery: true },
    )
  },

  /**
   * AUTH-002 · POST /auth/signup — signupToken으로 온보딩을 확정한다.
   * 선택 email이 있으면 가입 직후 소유 확인 메일이 발송된다(ADR-016).
   */
  async signup(request: SignupRequest): Promise<AuthTokenResponse> {
    if (usesAuthMocks) return mockAuthRepository.signup(request)

    return apiRequest<AuthTokenResponse>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify(request) },
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

  /** GET /users/me — 인증 수단, 등록된 본인 이메일(없으면 null), 소유 확인 여부를 알려준다. */
  async me(): Promise<MyProfileResponse> {
    if (usesAuthMocks) return mockAuthRepository.me()
    return apiRequest<MyProfileResponse>('/users/me')
  },
}
