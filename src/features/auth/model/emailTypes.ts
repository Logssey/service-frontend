import type { AuthTokenResponse } from '@/features/auth/model/types'

export type { AuthTokenResponse }

/**
 * POST /auth/email/signup 요청. 단일 요청으로 가입이 확정된다.
 *
 * 약관 2건은 소셜 온보딩과 같이 각각 동의를 받는다. 이메일 중복은 별도 확인 API 없이
 * 이 요청의 409로만 알린다 — 가입 여부가 드러나면 NFR-AUTH-018과 충돌한다.
 */
export interface EmailSignupRequest {
  email: string
  password: string
  nickname: string
  termsOfServiceAgreed: boolean
  privacyPolicyAgreed: boolean
}

/** POST /auth/email/login 요청 */
export interface EmailLoginRequest {
  email: string
  password: string
}

/** POST /auth/email/verification/confirm 요청. 발송 자체는 바디가 없다. */
export interface EmailVerificationConfirmRequest {
  code: string
}

/** POST /auth/password/reset 요청. 계정 유무와 무관하게 204다. */
export interface PasswordResetRequest {
  email: string
}

/** POST /auth/password/reset/confirm 요청 */
export interface PasswordResetConfirmRequest {
  email: string
  code: string
  newPassword: string
}
