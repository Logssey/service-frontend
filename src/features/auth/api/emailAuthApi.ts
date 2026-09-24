import { usesAuthMocks } from '@/features/auth/lib/authMode'
import type {
  AuthTokenResponse,
  EmailLoginRequest,
  EmailSignupRequest,
  EmailVerificationConfirmRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
} from '@/features/auth/model/emailTypes'
import { mockAuthRepository } from '@/mocks/authRepository'
import { apiRequest } from '@/shared/api/http'

/**
 * 이메일 계정 인증 API(05-api/endpoints/auth).
 *
 * 이메일 중복확인 API는 없다. 계정 존재 여부가 드러나지 않아야 하므로(NFR-AUTH-018)
 * 이메일 중복은 가입 요청의 409로만 알린다.
 */
export const emailAuthApi = {
  /** AUTH-004 · POST /auth/email/signup — 가입 직후 로그인 상태가 되고 소유 확인 메일이 발송된다. */
  async emailSignup(request: EmailSignupRequest): Promise<AuthTokenResponse> {
    if (usesAuthMocks) return mockAuthRepository.emailSignup(request)

    return apiRequest<AuthTokenResponse>(
      '/auth/email/signup',
      { method: 'POST', body: JSON.stringify(request) },
      { skipAuthRecovery: true },
    )
  },

  /** AUTH-001 · POST /auth/email/login */
  async emailLogin(request: EmailLoginRequest): Promise<AuthTokenResponse> {
    if (usesAuthMocks) return mockAuthRepository.emailLogin(request)

    return apiRequest<AuthTokenResponse>(
      '/auth/email/login',
      { method: 'POST', body: JSON.stringify(request) },
      { skipAuthRecovery: true },
    )
  },

  /**
   * POST /auth/email/verification — 소유 확인 코드 재발송(USER).
   * 대상 주소는 토큰 사용자의 이메일이라 바디가 없다.
   */
  async resendVerification(): Promise<void> {
    if (usesAuthMocks) return mockAuthRepository.resendVerification()
    return apiRequest<void>('/auth/email/verification', { method: 'POST' })
  },

  /** POST /auth/email/verification/confirm — 코드로 소유를 확인한다(USER). */
  async confirmVerification(request: EmailVerificationConfirmRequest): Promise<void> {
    if (usesAuthMocks) return mockAuthRepository.confirmVerification(request)

    return apiRequest<void>('/auth/email/verification/confirm', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /** AUTH-003 · POST /auth/password/reset — 계정 유무와 무관하게 204다. */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    if (usesAuthMocks) return mockAuthRepository.requestPasswordReset(request)

    return apiRequest<void>(
      '/auth/password/reset',
      { method: 'POST', body: JSON.stringify(request) },
      { skipAuthRecovery: true },
    )
  },

  /** AUTH-003 · POST /auth/password/reset/confirm — 성공하면 모든 세션이 끊긴다. */
  async confirmPasswordReset(request: PasswordResetConfirmRequest): Promise<void> {
    if (usesAuthMocks) return mockAuthRepository.confirmPasswordReset(request)

    return apiRequest<void>(
      '/auth/password/reset/confirm',
      { method: 'POST', body: JSON.stringify(request) },
      { skipAuthRecovery: true },
    )
  },
}
