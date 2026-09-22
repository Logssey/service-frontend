import type {
  AccessTokenResponse,
  AuthTokenResponse,
  KakaoLoginResponse,
  NicknameAvailabilityResponse,
  UserSummaryResponse,
} from '@/features/auth/model/types'
import { ApiClientError } from '@/shared/api/http'

/**
 * 인증 목 저장소.
 *
 * 백엔드 대역과 같은 규칙을 따른다 — 인가 코드가 곧 회원번호이므로 같은 코드로 다시
 * 로그인하면 같은 사용자가 된다. 처음 보는 코드는 SIGNUP_REQUIRED다.
 */
const CURRENT_USER: UserSummaryResponse = {
  userId: 3,
  nickname: '재현',
  profileImageUrl: null,
}

/** 이미 가입한 것으로 취급할 인가 코드. 중복확인에 걸릴 닉네임도 함께 둔다. */
const initialMembers = new Map<string, UserSummaryResponse>([['local-member', CURRENT_USER]])
const takenNicknames = ['재현', '판매왕', '중고왕']

/**
 * 이메일 계정 대역.
 *
 * 비밀번호를 평문으로 들고 있는 것은 목이기 때문이다. 실제 서버는 적응형 단방향 해시로
 * 보관한다(아카이브 NFR-SEC-002).
 */
interface LocalAccount {
  email: string
  password: string
  user: UserSummaryResponse
  emailVerified: boolean
}

const initialLocalAccounts: LocalAccount[] = [
  {
    email: 'test@reused.dev',
    password: 'test1234',
    user: { userId: 11, nickname: '테스트계정', profileImageUrl: null },
    emailVerified: true,
  },
]

interface ResetCode {
  code: string
  issuedAt: number
  used: boolean
}

const RESET_CODE_TTL_MINUTES = 10

let members = new Map(initialMembers)
let localAccounts = structuredClone(initialLocalAccounts)
let resetCodes = new Map<string, ResetCode>()
let session: UserSummaryResponse | null = null
let nextUserId = 4

const wait = (milliseconds = 130) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function issueToken(prefix: string) {
  return `${prefix}.${crypto.randomUUID()}`
}

export const mockAuthRepository = {
  async kakaoLogin(code: string): Promise<KakaoLoginResponse> {
    await wait()

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

  async signup(signupToken: string, nickname: string): Promise<AuthTokenResponse> {
    await wait()

    if (!signupToken.startsWith('signup-')) {
      throw new ApiClientError(401, 'UNAUTHENTICATED', '가입 토큰이 유효하지 않습니다.')
    }
    if (this.isNicknameTaken(nickname)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 사용 중인 닉네임입니다.')
    }

    // signupToken은 `signup-{인가코드}.{uuid}` 모양이라 코드를 되찾을 수 있다
    const code = signupToken.slice('signup-'.length).split('.')[0]
    const created: UserSummaryResponse = {
      userId: nextUserId++,
      nickname,
      profileImageUrl: null,
    }
    members.set(code, created)
    session = created

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

  isNicknameTaken(nickname: string) {
    const trimmed = nickname.trim()
    if (takenNicknames.includes(trimmed)) return true
    if (localAccounts.some((account) => account.user.nickname === trimmed)) return true
    return [...members.values()].some((member) => member.nickname === trimmed)
  },

  // ---------- 이메일 계정 (AUTH-001 로그인 · AUTH-003 재설정 · AUTH-004 가입) ----------

  async checkEmail(email: string) {
    await wait(80)
    return { available: !localAccounts.some((account) => account.email === normalize(email)) }
  },

  async emailSignup(
    email: string,
    password: string,
    nickname: string,
  ): Promise<AuthTokenResponse> {
    await wait()

    if (localAccounts.some((account) => account.email === normalize(email))) {
      throw new ApiClientError(409, 'CONFLICT', '이미 가입된 이메일입니다.')
    }
    if (this.isNicknameTaken(nickname)) {
      throw new ApiClientError(409, 'CONFLICT', '이미 사용 중인 닉네임입니다.')
    }

    const created: UserSummaryResponse = {
      userId: nextUserId++,
      nickname: nickname.trim(),
      profileImageUrl: null,
    }
    localAccounts.push({
      email: normalize(email),
      password,
      user: created,
      emailVerified: false,
    })
    session = created

    return { accessToken: issueToken('access'), user: structuredClone(created) }
  },

  /**
   * 이메일·비밀번호 로그인.
   *
   * 이메일이 없는 경우와 비밀번호가 틀린 경우의 응답을 구분하지 않는다.
   * 계정 존재 여부가 오류 응답으로 드러나지 않아야 한다(아카이브 NFR-SEC-011).
   */
  async emailLogin(email: string, password: string): Promise<AuthTokenResponse> {
    await wait()

    const account = localAccounts.find((item) => item.email === normalize(email))
    if (!account || account.password !== password) {
      throw new ApiClientError(
        401,
        'UNAUTHENTICATED',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      )
    }

    session = account.user
    return { accessToken: issueToken('access'), user: structuredClone(account.user) }
  },

  /**
   * 재설정 코드 발급.
   *
   * 실제 서버는 계정이 없어도 성공 응답만 준다. 여기서 코드를 돌려주는 것은 메일 대역이
   * 없는 로컬에서 화면을 확인하기 위한 것이다.
   */
  async requestPasswordReset(email: string) {
    await wait()
    const code = String(Math.floor(100000 + Math.random() * 900000))
    resetCodes.set(normalize(email), { code, issuedAt: Date.now(), used: false })
    return { devCode: code, expiresInMinutes: RESET_CODE_TTL_MINUTES }
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await wait()

    const issued = resetCodes.get(normalize(email))
    const expired =
      issued !== undefined &&
      Date.now() - issued.issuedAt > RESET_CODE_TTL_MINUTES * 60 * 1000

    if (!issued || issued.used || expired || issued.code !== code.trim()) {
      throw new ApiClientError(400, 'INVALID_INPUT', '인증코드가 올바르지 않거나 만료되었습니다.')
    }

    const account = localAccounts.find((item) => item.email === normalize(email))
    if (account) {
      account.password = newPassword
    }
    // 한 번 쓴 코드는 재사용할 수 없다 (아카이브 NFR-SEC-010)
    issued.used = true
    // 비밀번호를 바꾸면 기존 세션을 모두 폐기한다 (아카이브 NFR-SEC-009)
    session = null
  },

  reset() {
    members = new Map(initialMembers)
    localAccounts = structuredClone(initialLocalAccounts)
    resetCodes = new Map()
    session = null
    nextUserId = 4
  },
}

function normalize(email: string) {
  return email.trim().toLowerCase()
}
