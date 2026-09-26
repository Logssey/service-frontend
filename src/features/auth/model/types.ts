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
 *
 * 이메일은 선택 입력이다(ADR-019). 입력하면 이메일 가입과 같은 소유 확인 코드가 발송되며,
 * 로그인 식별자가 아니라 연락 수단이다. 입력할 때만 email과 선택 동의 emailCollectionAgreed를
 * 함께 보내고, 비어 있으면 두 필드를 모두 생략한다. 이메일을 보냈는데 동의가 true가 아니면 400이다.
 */
export interface SignupRequest {
  signupToken: string
  nickname: string
  email?: string
  emailCollectionAgreed?: boolean
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
 * provider·email·emailVerified는 본인 응답에만 있다. 비밀번호 변경 메뉴 노출과
 * 이메일 미인증 표시에 쓴다(내 정보 조회 명세).
 *
 * email은 인증 수단에 등록된 본인 주소다. LOCAL은 항상 있고, 소셜 계정은 온보딩에서 입력했을 때만
 * 있으며 아니면 null이다(ADR-019). emailVerified는 그 주소의 소유 확인 여부이고 이메일이 없으면 false다.
 * 소유 확인 대상은 provider가 아니라 email 유무로 가린다 — email이 있고 emailVerified가 false일 때만이다.
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
  email: string | null
  emailVerified: boolean
  createdAt: string
}
