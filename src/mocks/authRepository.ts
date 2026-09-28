import { EMAIL_MAX, isEmailShaped } from '@/features/auth/lib/passwordPolicy'
import type {
  EmailLoginRequest,
  EmailSignupRequest,
  EmailVerificationConfirmRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
} from '@/features/auth/model/emailTypes'
import type {
  AccessTokenResponse,
  AuthTokenResponse,
  MyProfileResponse,
  NicknameAvailabilityResponse,
  OAuthLoginResponse,
  SignupRequest,
  UserSummaryResponse,
} from '@/features/auth/model/types'
import { ApiClientError } from '@/shared/api/http'

/**
 * 인증 목 저장소. API 명세(05-api/endpoints/auth)의 응답 코드와 정책 값을 그대로 흉내 낸다.
 *
 * 소셜 대역은 인가 코드가 곧 회원번호다. 같은 코드로 다시 로그인하면 같은 사용자가 되고,
 * 처음 보는 코드는 SIGNUP_REQUIRED다.
 */
const CURRENT_USER: UserSummaryResponse = {
  userId: 3,
  nickname: '재현',
  profileImageUrl: null,
}

/** 이미 가입한 것으로 취급할 인가 코드. 중복확인에 걸릴 닉네임도 함께 둔다. */
const initialMembers = new Map<string, UserSummaryResponse>([['local-member', CURRENT_USER]])
const takenNicknames = ['재현', '판매왕', '중고왕']

/** 소유 확인 대상 이메일. LOCAL 계정과 이메일을 등록한 소셜 계정이 같은 모양을 쓴다. */
interface RegisteredEmail {
  email: string
  emailVerified: boolean
}

/**
 * 이메일 계정 대역. 비밀번호를 평문으로 들고 있는 것은 목이기 때문이다.
 * 실제 서버는 argon2id로 보관한다(NFR-AUTH-014).
 */
interface LocalAccount extends RegisteredEmail {
  password: string
  user: UserSummaryResponse
}

const initialLocalAccounts: LocalAccount[] = [
  {
    email: 'test@reused.dev',
    password: 'test1234',
    user: { userId: 11, nickname: '테스트계정', profileImageUrl: null },
    emailVerified: true,
  },
]

export type CodePurpose = 'verify' | 'reset'

interface IssuedCode {
  code: string
  issuedAt: number
  used: boolean
  attempts: number
}

/** business-rules 4장 정책 값 */
const CODE_TTL_MINUTES = 10
const CODE_MAX_ATTEMPTS = 5

let members = new Map([...initialMembers].map(([key, user]) => [key, structuredClone(user)]))
let localAccounts = structuredClone(initialLocalAccounts)
let bios = new Map<number, string | null>()
/**
 * 온보딩에서 선택 입력한 소셜 계정 이메일(ADR-016). userId 기준이다.
 * 식별자가 아니므로 이메일 로그인·재설정 조회에는 쓰지 않는다.
 */
let socialEmails = new Map<number, RegisteredEmail>()
let codes = new Map<string, IssuedCode>()
let session: UserSummaryResponse | null = null
let nextUserId = 4

const wait = (milliseconds = 130) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function issueToken(prefix: string) {
  return `${prefix}.${crypto.randomUUID()}`
}

export const mockAuthRepository = {
  async oauthLogin(provider: string, code: string): Promise<OAuthLoginResponse> {
    await wait()

    if (provider !== 'kakao') {
      throw new ApiClientError(404, 'NOT_FOUND', '지원하지 않는 로그인 제공자입니다.')
    }

    const member = members.get(code)
    if (!member) {
      return {
        status: 'SIGNUP_REQUIRED',
        accessToken: null,
        signupToken: issueToken(`signup-${code}`),
        user: null,
      }
    }

    session = member
    return {
      status: 'LOGIN',
      accessToken: issueToken('access'),
      signupToken: null,
      user: structuredClone(member),
    }
  },

  /**
   * 이메일은 선택이다. 입력 단계에서는 중복을 검사하지 않는다 — 확인 전 주소는 선점할 수 없고
   * 가입 여부도 드러나지 않아야 한다. 입력했으면 선택 동의가 필요하고 소유 확인 코드가 발급된다.
   */
  async signup(request: SignupRequest): Promise<AuthTokenResponse> {
    await wait()

    if (!request.signupToken.startsWith('signup-')) {
      throw new ApiClientError(401, 'UNAUTHENTICATED', '가입 토큰이 유효하지 않습니다.')
    }
    if (!request.termsOfServiceAgreed || !request.privacyPolicyAgreed) {
      throw new ApiClientError(400, 'INVALID_INPUT', '필수 약관에 모두 동의해야 합니다.')
    }
    const email = optionalEmailOf(request.email)
    if (email !== null && request.emailCollectionAgreed !== true) {
      throw new ApiClientError(
        400,
        'INVALID_INPUT',
        '이메일을 등록하려면 이메일 수집·이용에 동의해야 합니다.',
      )
    }
    if (this.isNicknameTaken(request.nickname)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 사용 중인 닉네임입니다.')
    }

    // signupToken은 `signup-{인가코드}.{uuid}` 모양이라 코드를 되찾을 수 있다
    const code = request.signupToken.slice('signup-'.length).split('.')[0]
    const created: UserSummaryResponse = {
      userId: nextUserId++,
      nickname: request.nickname.trim(),
      profileImageUrl: null,
    }
    members.set(code, created)
    session = created
    if (email !== null) {
      socialEmails.set(created.userId, { email, emailVerified: false })
      issueCode('verify', verifyCodeKey(created.userId))
    }

    return { accessToken: issueToken('access'), user: structuredClone(created) }
  },

  async refresh(): Promise<AccessTokenResponse> {
    await wait()
    if (!session) {
      throw new ApiClientError(401, 'UNAUTHENTICATED', 'Refresh Token 쿠키가 없습니다.')
    }
    return { accessToken: issueToken('access') }
  },

  async logout(): Promise<void> {
    await wait()
    session = null
  },

  async checkNickname(nickname: string): Promise<NicknameAvailabilityResponse> {
    await wait(80)
    return { available: !this.isNicknameTaken(nickname) }
  },

  async me(): Promise<MyProfileResponse> {
    await wait(80)
    const current = requireSession()
    const target = findVerificationTarget(current)
    return {
      userId: current.userId,
      nickname: current.nickname,
      profileImageUrl: current.profileImageUrl,
      bio: bios.get(current.userId) ?? null,
      role: 'USER',
      status: 'ACTIVE',
      suspendedUntil: null,
      provider: findAccountOf(current) ? 'LOCAL' : 'KAKAO',
      email: target?.email ?? null,
      emailVerified: target?.emailVerified ?? false,
      createdAt: '2026-01-10T03:00:00Z',
    }
  },

  async updateProfile(request: { nickname?: string; bio?: string | null; imageId?: number | null }): Promise<MyProfileResponse> {
    await wait()
    const current = requireSession()
    if (request.nickname !== undefined) {
      const nickname = request.nickname.trim()
      if (nickname.length < 2 || nickname.length > 20 || (nickname !== current.nickname && this.isNicknameTaken(nickname))) {
        throw new ApiClientError(409, 'CONFLICT', '사용할 수 없는 닉네임입니다.')
      }
      current.nickname = nickname
    }
    if (request.bio !== undefined) bios.set(current.userId, request.bio)
    if (request.imageId === null) current.profileImageUrl = null
    if (request.imageId !== undefined && request.imageId !== null) {
      current.profileImageUrl = `/images/mock-profile-${request.imageId}.png`
    }
    return this.me()
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await wait()
    const current = requireSession()
    const account = findAccountOf(current)
    if (!account || account.password !== currentPassword) {
      throw new ApiClientError(401, 'UNAUTHENTICATED', '현재 비밀번호가 올바르지 않습니다.')
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new ApiClientError(400, 'INVALID_INPUT', '새 비밀번호는 8~128자여야 합니다.')
    }
    account.password = newPassword
    session = null
  },

  async withdraw(): Promise<void> {
    await wait()
    const current = requireSession()
    localAccounts = localAccounts.filter((account) => account.user.userId !== current.userId)
    for (const [key, member] of members) {
      if (member.userId === current.userId) members.delete(key)
    }
    socialEmails.delete(current.userId)
    bios.delete(current.userId)
    session = null
  },

  isNicknameTaken(nickname: string) {
    const trimmed = nickname.trim()
    if (takenNicknames.includes(trimmed)) return true
    if (localAccounts.some((account) => account.user.nickname === trimmed)) return true
    return [...members.values()].some((member) => member.nickname === trimmed)
  },

  // ---------- 이메일 계정 (AUTH-001 로그인 · AUTH-003 재설정 · AUTH-004 가입) ----------

  /**
   * 이메일 중복은 별도 확인 API 없이 여기서 409로만 알린다(NFR-AUTH-018).
   * 가입 직후 로그인 상태가 되고 소유 확인 코드가 발급된다.
   */
  async emailSignup(request: EmailSignupRequest): Promise<AuthTokenResponse> {
    await wait()

    if (!request.termsOfServiceAgreed || !request.privacyPolicyAgreed) {
      throw new ApiClientError(400, 'INVALID_INPUT', '필수 약관에 모두 동의해야 합니다.')
    }
    const email = normalize(request.email)
    if (localAccounts.some((account) => account.email === email)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 가입된 이메일입니다.')
    }
    if (this.isNicknameTaken(request.nickname)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 사용 중인 닉네임입니다.')
    }

    const created: UserSummaryResponse = {
      userId: nextUserId++,
      nickname: request.nickname.trim(),
      profileImageUrl: null,
    }
    localAccounts.push({ email, password: request.password, user: created, emailVerified: false })
    session = created
    issueCode('verify', verifyCodeKey(created.userId))

    return { accessToken: issueToken('access'), user: structuredClone(created) }
  },

  /**
   * 이메일이 없는 경우와 비밀번호가 틀린 경우의 응답을 구분하지 않는다(NFR-AUTH-018).
   * 조회 대상은 LOCAL 계정뿐이다. 소셜 계정에 등록된 이메일로는 로그인할 수 없다(ADR-016).
   */
  async emailLogin(request: EmailLoginRequest): Promise<AuthTokenResponse> {
    await wait()

    const account = localAccounts.find((item) => item.email === normalize(request.email))
    if (!account || account.password !== request.password) {
      throw new ApiClientError(
        401,
        'UNAUTHENTICATED',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      )
    }

    session = account.user
    return { accessToken: issueToken('access'), user: structuredClone(account.user) }
  },

  /** 이미 다른 계정에서 인증된 주소여도 재발송은 막지 않는다. 판정은 확인 단계에서 한다(ADR-016). */
  async resendVerification(): Promise<void> {
    await wait()
    const current = requireSession()
    const target = findVerificationTarget(current)
    if (!target) {
      throw new ApiClientError(409, 'CONFLICT', '등록된 이메일이 없습니다.')
    }
    if (target.emailVerified) {
      throw new ApiClientError(409, 'CONFLICT', '이미 소유 확인이 완료된 이메일입니다.')
    }
    issueCode('verify', verifyCodeKey(current.userId))
  },

  /**
   * 인증을 마친 소셜 이메일은 한 계정에만 둔다(ADR-016). 코드로 소유가 증명된 뒤에만 409로 알리며,
   * 그때 코드는 소비하지 않는다. LOCAL 계정과 같은 주소인 것은 막지 않는다.
   */
  async confirmVerification(request: EmailVerificationConfirmRequest): Promise<void> {
    await wait()
    const current = requireSession()
    const target = findVerificationTarget(current)
    if (!target) {
      throw invalidCode()
    }
    const issued = matchCode(verifyCodeKey(current.userId), request.code)
    if (!findAccountOf(current) && isVerifiedOnOtherSocialAccount(current.userId, target.email)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 다른 계정에서 인증된 이메일입니다.')
    }
    issued.used = true
    target.emailVerified = true
  },

  /**
   * 실제 서버처럼 계정이 없어도 성공으로 끝난다. 코드는 존재하는 LOCAL 계정에만 발급한다.
   * 소셜 계정에 등록된 이메일은 재설정 대상이 아니다(ADR-016).
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    await wait()
    const email = normalize(request.email)
    if (localAccounts.some((account) => account.email === email)) {
      issueCode('reset', resetCodeKey(email))
    }
  },

  async confirmPasswordReset(request: PasswordResetConfirmRequest): Promise<void> {
    await wait()
    const email = normalize(request.email)
    const account = localAccounts.find((item) => item.email === email)
    // 계정이 없으면 코드 불일치와 같은 400이다
    if (!account) {
      throw invalidCode()
    }
    matchCode(resetCodeKey(email), request.code).used = true
    account.password = request.newPassword
    // 비밀번호를 바꾸면 기존 세션을 모두 폐기한다(NFR-AUTH-016)
    session = null
  },

  /**
   * 실제 서버는 코드를 메일로만 보낸다. 메일 대역이 없는 목 모드에서 화면·테스트가
   * 코드를 얻는 유일한 통로다. 발급 시 콘솔에도 남긴다.
   *
   * 소유 확인 코드는 계정 기준이다. 서버가 인증 수단 기준으로 키를 두는 것처럼, 같은 주소의
   * LOCAL·카카오 계정이 서로의 코드를 덮어쓰지 않게 이메일이 아니라 userId로 찾는다.
   */
  peekVerificationCode(userId: number): string | null {
    return codes.get(verifyCodeKey(userId))?.code ?? null
  },

  /** 재설정 코드는 LOCAL 이메일 기준이다. */
  peekResetCode(email: string): string | null {
    return codes.get(resetCodeKey(email))?.code ?? null
  },

  reset() {
    members = new Map([...initialMembers].map(([key, user]) => [key, structuredClone(user)]))
    localAccounts = structuredClone(initialLocalAccounts)
    bios = new Map()
    socialEmails = new Map()
    codes = new Map()
    session = null
    nextUserId = 4
  },
}

function requireSession(): UserSummaryResponse {
  if (!session) {
    throw new ApiClientError(401, 'UNAUTHENTICATED', '인증이 필요합니다.')
  }
  return session
}

function findAccountOf(user: UserSummaryResponse) {
  return localAccounts.find((account) => account.user.userId === user.userId)
}

/**
 * 소유 확인 대상은 provider가 아니라 등록된 이메일로 정한다. 돌려준 객체를 고치면 원본이 바뀐다.
 * 이메일이 없는 소셜 계정은 undefined다.
 */
function findVerificationTarget(user: UserSummaryResponse): RegisteredEmail | undefined {
  return findAccountOf(user) ?? socialEmails.get(user.userId)
}

function isVerifiedOnOtherSocialAccount(userId: number, email: string) {
  return [...socialEmails].some(
    ([ownerId, registered]) =>
      ownerId !== userId && registered.emailVerified && registered.email === email,
  )
}

/**
 * 서버처럼 생략·빈 문자열은 미입력으로 보고, 앞뒤 공백·형식·길이 위반은 400이다.
 * 저장 전에는 이메일 가입과 같이 소문자로 정규화한다.
 */
function optionalEmailOf(raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  if (raw !== raw.trim() || raw.length > EMAIL_MAX || !isEmailShaped(raw)) {
    throw new ApiClientError(400, 'INVALID_INPUT', '이메일 형식이 올바르지 않습니다.')
  }
  return normalize(raw)
}

function verifyCodeKey(userId: number) {
  return `verify:user:${userId}`
}

function resetCodeKey(email: string) {
  return `reset:${normalize(email)}`
}

function issueCode(purpose: CodePurpose, key: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codes.set(key, { code, issuedAt: Date.now(), used: false, attempts: 0 })
  if (import.meta.env.MODE !== 'test') {
    console.info(`[mock mail] ${purpose === 'verify' ? '이메일 인증' : '비밀번호 재설정'} 코드 → ${code}`)
  }
}

/**
 * 만료·재사용·불일치를 구분하지 않고 같은 400을 낸다. 코드당 5회를 넘기면 폐기하고 429다(NFR-AUTH-017).
 * 맞는 코드를 돌려줄 뿐 사용 처리는 하지 않는다. 남은 검사를 마친 호출부가 used로 둔다.
 */
function matchCode(key: string, code: string): IssuedCode {
  const issued = codes.get(key)
  const expired = issued !== undefined && Date.now() - issued.issuedAt > CODE_TTL_MINUTES * 60 * 1000

  if (!issued || issued.used || expired) {
    throw invalidCode()
  }

  issued.attempts += 1
  if (issued.attempts > CODE_MAX_ATTEMPTS) {
    codes.delete(key)
    throw new ApiClientError(
      429,
      'RATE_LIMITED',
      '인증 코드 확인 횟수를 초과했습니다. 코드를 다시 요청해 주세요.',
    )
  }
  if (issued.code !== code.trim()) {
    throw invalidCode()
  }

  return issued
}

function invalidCode() {
  return new ApiClientError(400, 'INVALID_INPUT', '인증 코드가 올바르지 않거나 만료되었습니다.')
}

function normalize(email: string) {
  return email.trim().toLowerCase()
}
