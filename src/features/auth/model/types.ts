// UserSummaryResponse는 API 명세의 공용 DTO다. 개발자 A가 listings에 먼저 정의해 두었으므로
// 같은 모양을 다시 선언하지 않고 그대로 쓴다.
import type { UserSummaryResponse } from '@/features/listings/model/types'

export type { UserSummaryResponse }

/** 1차 릴리스는 kakao만 허용한다(ADR-004). 경로 변수는 소문자다. */
export type OAuthProvider = 'kakao'

export type LoginStatus = 'LOGIN' | 'SIGNUP_REQUIRED'

/** POST /auth/oauth/{provider} 요청 */
export interface OAuthLoginRequest {
  code: string
  redirectUri: string
}

/** POST /auth/oauth/{provider} 응답. 기존 회원은 LOGIN, 신규는 SIGNUP_REQUIRED다. */
export interface OAuthLoginResponse {
  status: LoginStatus
  accessToken: string | null
  signupToken: string | null
  user: UserSummaryResponse | null
}

/**
 * POST /auth/signup 요청.
 *
 * 필수 약관 2건은 각각 동의를 받는다. 하나의 필드로 합치지 않는다(소셜 온보딩 명세).
 */
export interface SignupRequest {
  signupToken: string
  nickname: string
  termsOfServiceAgreed: boolean
  privacyPolicyAgreed: boolean
}

/** POST /auth/signup · /auth/email/signup · /auth/email/login 응답 */
export interface AuthTokenResponse {
  accessToken: string
  user: UserSummaryResponse
}

/** POST /auth/refresh 응답 */
export interface AccessTokenResponse {
  accessToken: string
}

/** GET /users/nickname/check 응답. 확인 시점의 결과이며 예약이 아니다. */
export interface NicknameAvailabilityResponse {
  available: boolean
}

/**
 * GET /users/me 응답.
 *
 * provider와 emailVerified는 본인 응답에만 있다. 비밀번호 변경 메뉴 노출과
 * 이메일 미인증 표시에 쓴다(내 정보 조회 명세).
 */
export interface MyProfileResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
  suspendedUntil: string | null
  provider: 'KAKAO' | 'LOCAL'
  emailVerified: boolean
  createdAt: string
}
