import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { useAuthStore } from '@/features/auth/model/authStore'
import { mockAuthRepository } from '@/mocks/authRepository'

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const submitButton = () => screen.getByRole('button', { name: '시작하기' })

/** 카카오 콜백을 거친 것처럼 가입 토큰을 쥐고 온보딩 화면을 연다. */
function startOnboarding(kakaoCode: string) {
  useAuthStore.setState({ signupToken: `signup-${kakaoCode}.token` })
  return renderRoute('/onboarding')
}

/** 닉네임 중복확인과 필수 약관 2건까지 마친다. 이메일과 선택 동의는 각 테스트가 정한다. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>, nickname: string) {
  await user.type(screen.getByLabelText('닉네임'), nickname)
  await user.click(screen.getByRole('button', { name: '중복확인' }))
  expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()
  await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
  await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))
}

async function onboardWithEmail(
  user: ReturnType<typeof userEvent.setup>,
  kakaoCode: string,
  nickname: string,
  email: string,
) {
  const view = startOnboarding(kakaoCode)
  await fillRequired(user, nickname)
  await user.type(screen.getByLabelText('이메일 (선택)'), email)
  await user.click(screen.getByLabelText('[선택] 이메일 수집·이용 동의'))
  await user.click(submitButton())
  expect(
    await screen.findByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' }),
  ).toBeInTheDocument()
  return view
}

/** 소유 확인 코드는 이메일이 아니라 로그인한 계정 기준으로 발급된다. */
function issuedVerificationCode() {
  const userId = useAuthStore.getState().user?.userId
  expect(userId).toBeDefined()
  const code = mockAuthRepository.peekVerificationCode(userId ?? -1)
  expect(code).toHaveLength(6)
  return code ?? ''
}

describe('AUTH-002 소셜 온보딩 선택 이메일 (FR-AUTH-017)', () => {
  beforeEach(() => {
    mockAuthRepository.reset()
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
    sessionStorage.clear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('이메일을 비워 두면 선택 동의 없이 가입되어 홈으로 가고, 요청에 이메일 필드를 싣지 않는다', async () => {
    const user = userEvent.setup()
    const signup = vi.spyOn(mockAuthRepository, 'signup')
    startOnboarding('kakao-no-email')

    expect(screen.getByLabelText('이메일 (선택)')).toHaveValue('')
    await fillRequired(user, '이메일없음')
    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())
    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()

    const request = signup.mock.calls[0][0]
    expect(request).not.toHaveProperty('email')
    expect(request).not.toHaveProperty('emailCollectionAgreed')
  })

  it('형식이 틀린 이메일은 알리고 제출을 막으며, 지우면 다시 제출할 수 있다', async () => {
    const user = userEvent.setup()
    startOnboarding('kakao-bad-email')
    await fillRequired(user, '형식오류')

    await user.type(screen.getByLabelText('이메일 (선택)'), 'not-an-email')
    await user.click(screen.getByLabelText('[선택] 이메일 수집·이용 동의'))
    expect(screen.getByText('* 이메일 형식이 올바르지 않습니다')).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await user.clear(screen.getByLabelText('이메일 (선택)'))
    expect(screen.queryByText('* 이메일 형식이 올바르지 않습니다')).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('이메일을 입력하면 선택 동의가 있어야 제출되고, 인증 화면에서 등록한 주소를 보여 주며 코드로 확인한다', async () => {
    const user = userEvent.setup()
    const signup = vi.spyOn(mockAuthRepository, 'signup')
    startOnboarding('kakao-with-email')
    await fillRequired(user, '메일등록')

    await user.type(screen.getByLabelText('이메일 (선택)'), 'Kakao@Reused.dev')
    expect(
      screen.getByText('* 이메일을 등록하려면 이메일 수집·이용에 동의해 주세요'),
    ).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await user.click(screen.getByLabelText('[선택] 이메일 수집·이용 동의'))
    expect(submitButton()).toBeEnabled()
    await user.click(submitButton())

    expect(
      await screen.findByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' }),
    ).toBeInTheDocument()
    // 서버가 정규화해 저장한 본인 주소를 내 정보에서 받아 보여 준다
    expect(screen.getByText(/kakao@reused\.dev 주소로/)).toBeInTheDocument()
    expect(signup.mock.calls[0][0]).toMatchObject({
      email: 'Kakao@Reused.dev',
      emailCollectionAgreed: true,
    })

    await user.type(screen.getByLabelText('인증코드'), issuedVerificationCode())
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(
      await screen.findByRole('heading', { name: '이메일 인증이 완료되었습니다' }),
    ).toBeInTheDocument()
  })

  it('이메일을 등록한 카카오 계정은 다시 보내기로 새 코드를 받아 확인한다', async () => {
    const user = userEvent.setup()
    await onboardWithEmail(user, 'kakao-resend', '재발송', 'resend@reused.dev')

    await user.click(screen.getByRole('button', { name: '다시 보내기' }))
    expect(await screen.findByRole('status')).toHaveTextContent('인증코드를 다시 보냈습니다.')

    await user.type(screen.getByLabelText('인증코드'), issuedVerificationCode())
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(
      await screen.findByRole('heading', { name: '이메일 인증이 완료되었습니다' }),
    ).toBeInTheDocument()
  })

  it('이메일 없이 가입한 카카오 계정은 인증 화면에 들어오면 홈으로 가고, 재발송은 409다', async () => {
    const login = await mockAuthRepository.oauthLogin('kakao', 'local-member')
    useAuthStore.setState({ accessToken: login.accessToken, user: login.user })
    renderRoute('/verify-email')

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    await expect(mockAuthRepository.resendVerification()).rejects.toMatchObject({
      status: 409,
      message: '등록된 이메일이 없습니다.',
    })
  })

  it('로그인 없이 인증 화면을 열면 카카오 로그인도 있는 기본 로그인 화면으로 보낸다', async () => {
    // 액세스 토큰은 메모리에만 있어 새로고침하거나 주소로 바로 열면 비어 있다
    const view = renderRoute('/verify-email')
    expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 필요합니다.')
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument()
    view.unmount()

    // 토큰은 남았지만 세션이 끝나 내 정보 조회가 실패해도 같은 화면으로 보낸다
    useAuthStore.setState({ accessToken: 'expired-access.token' })
    renderRoute('/verify-email')
    expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 필요합니다.')
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument()
  })

  it('이메일 가입 계정과 같은 주소도 온보딩에서 막지 않으며, 이메일 로그인은 여전히 그 이메일 계정이다', async () => {
    const user = userEvent.setup()
    const view = await onboardWithEmail(user, 'kakao-same-as-local', '같은주소', 'test@reused.dev')
    expect(screen.getByText(/test@reused\.dev 주소로/)).toBeInTheDocument()

    view.unmount()
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
    renderRoute('/login')
    await user.type(screen.getByLabelText('이메일'), 'test@reused.dev')
    await user.type(screen.getByLabelText('비밀번호'), 'test1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('테스트계정')
  })

  it('다른 카카오 계정에서 이미 인증된 주소는 확인 단계에서 409로 알리고 코드를 소비하지 않는다', async () => {
    const user = userEvent.setup()
    // 먼저 가입한 카카오 계정이 같은 주소의 소유 확인을 마쳐 둔다
    const first = await mockAuthRepository.signup({
      signupToken: 'signup-kakao-first.token',
      nickname: '먼저인증',
      email: 'shared@reused.dev',
      emailCollectionAgreed: true,
      termsOfServiceAgreed: true,
      privacyPolicyAgreed: true,
    })
    await mockAuthRepository.confirmVerification({
      code: mockAuthRepository.peekVerificationCode(first.user.userId) ?? '',
    })

    // 입력 단계에서는 중복을 검사하지 않으므로 가입은 된다
    await onboardWithEmail(user, 'kakao-second', '나중인증', 'shared@reused.dev')
    const code = issuedVerificationCode()

    await user.type(screen.getByLabelText('인증코드'), code)
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 다른 계정에서 인증된 이메일입니다.',
    )
    expect(
      screen.getByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('인증코드')).toHaveValue('')

    // 코드가 소비됐다면 두 번째 시도는 코드 오류(400)로 끝난다
    await user.type(screen.getByLabelText('인증코드'), code)
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 다른 계정에서 인증된 이메일입니다.',
    )
  })

  it('목도 서버처럼 선택 동의 없는 이메일과 공백이 붙은 이메일을 400으로 거절하고, 소셜 이메일로는 로그인·재설정할 수 없다', async () => {
    const base = {
      nickname: '목계약',
      termsOfServiceAgreed: true,
      privacyPolicyAgreed: true,
    }
    await expect(
      mockAuthRepository.signup({
        ...base,
        signupToken: 'signup-kakao-no-consent.token',
        email: 'consent@reused.dev',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: '이메일을 등록하려면 이메일 수집·이용에 동의해야 합니다.',
    })
    await expect(
      mockAuthRepository.signup({
        ...base,
        signupToken: 'signup-kakao-padded.token',
        email: ' padded@reused.dev ',
        emailCollectionAgreed: true,
      }),
    ).rejects.toMatchObject({ status: 400, message: '이메일 형식이 올바르지 않습니다.' })

    await mockAuthRepository.signup({
      ...base,
      signupToken: 'signup-kakao-only.token',
      email: 'kakao-only@reused.dev',
      emailCollectionAgreed: true,
    })
    await mockAuthRepository.requestPasswordReset({ email: 'kakao-only@reused.dev' })
    expect(mockAuthRepository.peekResetCode('kakao-only@reused.dev')).toBeNull()
    await expect(
      mockAuthRepository.emailLogin({ email: 'kakao-only@reused.dev', password: 'anything1' }),
    ).rejects.toMatchObject({ status: 401 })
  })
})
