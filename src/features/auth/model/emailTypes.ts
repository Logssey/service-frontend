import type { AuthTokenResponse } from '@/features/auth/model/types'

export type { AuthTokenResponse }

/** POST /auth/email/signup (예정) */
export interface EmailSignupRequest {
  email: string
  password: string
  nickname: string
  termsAgreed: boolean
}

/** POST /auth/email/login (예정) */
export interface EmailLoginRequest {
  email: string
  password: string
}

export interface EmailAvailabilityResponse {
  available: boolean
}

/**
 * POST /auth/password/reset-request (예정)
 *
 * 실제 서버는 계정 존재 여부를 숨기기 위해 항상 204만 준다(아카이브 NFR-SEC-011).
 * 여기서 코드를 돌려주는 것은 메일 대역이 없는 로컬에서 화면을 확인하기 위한 것이다.
 */
export interface PasswordResetCodeResponse {
  devCode: string
  expiresInMinutes: number
}

/** POST /auth/password/reset (예정) */
export interface PasswordResetRequest {
  email: string
  code: string
  newPassword: string
}
