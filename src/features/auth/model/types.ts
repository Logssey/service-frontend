// UserSummaryResponse는 API 명세의 공용 DTO다. 개발자 A가 listings에 먼저 정의해 두었으므로
// 같은 모양을 다시 선언하지 않고 그대로 쓴다.
import type { UserSummaryResponse } from '@/features/listings/model/types'

export type { UserSummaryResponse }

export type LoginStatus = 'LOGIN' | 'SIGNUP_REQUIRED'

/** POST /auth/kakao */
export interface KakaoLoginResponse {
  status: LoginStatus
  accessToken: string | null
  signupToken: string | null
  user: UserSummaryResponse | null
}

/** POST /auth/signup */
export interface AuthTokenResponse {
  accessToken: string
  user: UserSummaryResponse
}

/** POST /auth/refresh */
export interface AccessTokenResponse {
  accessToken: string
}

/**
 * GET /users/nickname/check
 *
 * 화면설계서 AUTH-002에 중복확인 버튼이 있으나 API 명세(05-api)에는 이 엔드포인트가 없다.
 * 백엔드에 추가해 두었고 명세 반영이 필요하다.
 */
export interface NicknameAvailabilityResponse {
  available: boolean
}
