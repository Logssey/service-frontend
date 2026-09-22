import type {
  AuthTokenResponse,
  EmailAvailabilityResponse,
  PasswordResetCodeResponse,
} from '@/features/auth/model/emailTypes'
import { mockAuthRepository } from '@/mocks/authRepository'

/**
 * 이메일 계정 인증 — 화면 확인용 목 전용.
 *
 * 백엔드에 아직 해당 엔드포인트가 없어 실제 호출 분기를 두지 않았다. 구현되면
 * authApi처럼 `usesAuthMocks` 분기를 넣고 아래 주석의 경로를 연결한다.
 * 지금 분기를 넣으면 VITE_USE_MOCKS_AUTH=false인 환경에서 404를 받는다.
 *
 * 예정 경로
 *   POST /api/v1/auth/email/signup
 *   POST /api/v1/auth/email/login
 *   POST /api/v1/auth/password/reset-request
 *   POST /api/v1/auth/password/reset
 */
export const emailAuthApi = {
  /**
   * AUTH-004 이메일 중복확인.
   *
   * 화면설계서(아카이브 AUTH-002)에 중복확인 버튼이 있어 화면에 넣었다.
   * 다만 아카이브 NFR-SEC-011은 계정 존재 여부가 드러나지 않도록 요구하므로
   * 이 버튼을 실제로 남길지는 결정이 필요하다.
   */
  checkEmail(email: string): Promise<EmailAvailabilityResponse> {
    return mockAuthRepository.checkEmail(email)
  },

  emailSignup(email: string, password: string, nickname: string): Promise<AuthTokenResponse> {
    return mockAuthRepository.emailSignup(email, password, nickname)
  },

  emailLogin(email: string, password: string): Promise<AuthTokenResponse> {
    return mockAuthRepository.emailLogin(email, password)
  },

  requestPasswordReset(email: string): Promise<PasswordResetCodeResponse> {
    return mockAuthRepository.requestPasswordReset(email)
  },

  resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    return mockAuthRepository.resetPassword(email, code, newPassword)
  },
}
