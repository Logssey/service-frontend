import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
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

/** 실제 서버는 코드를 메일로만 보낸다. 테스트는 목의 발급 기록에서 코드를 꺼낸다. */
function expectCode(code: string | null) {
  expect(code).toHaveLength(6)
  return code ?? ''
}

/** 소유 확인 코드는 이메일이 아니라 로그인한 계정 기준으로 발급된다. */
function issuedVerificationCode() {
  const userId = useAuthStore.getState().user?.userId
  expect(userId).toBeDefined()
  return expectCode(mockAuthRepository.peekVerificationCode(userId ?? -1))
}

function issuedResetCode(email: string) {
  return expectCode(mockAuthRepository.peekResetCode(email))
}

async function signUpByEmail(user: ReturnType<typeof userEvent.setup>, email: string, nickname: string) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), 'newpass1234')
  await user.type(screen.getByLabelText('Password Confirm'), 'newpass1234')
  await user.type(screen.getByLabelText('Nickname'), nickname)
  await user.click(screen.getByRole('button', { name: '중복확인' }))
  expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()
  await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
  await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))
  await user.click(screen.getByRole('button', { name: 'Sign Up' }))
}

describe('AUTH-001 · 003 · 004 이메일 계정 화면', () => {
  beforeEach(() => {
    mockAuthRepository.reset()
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
    sessionStorage.clear()
    localStorage.clear()
  })

  it('AUTH-001 이메일과 비밀번호로 로그인한다', async () => {
    const user = userEvent.setup()
    renderRoute('/login')

    expect(screen.getByRole('button', { name: '로그인' })).toBeDisabled()

    await user.type(screen.getByLabelText('이메일'), 'test@reused.dev')
    await user.type(screen.getByLabelText('비밀번호'), 'test1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('테스트계정')
  })

  it('AUTH-001 이메일이 없을 때와 비밀번호가 틀릴 때의 응답이 같다', async () => {
    const user = userEvent.setup()
    renderRoute('/login/email')

    await user.type(screen.getByLabelText('이메일'), 'test@reused.dev')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    const wrongPassword = await screen.findByRole('alert')
    expect(wrongPassword).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')

    await user.clear(screen.getByLabelText('이메일'))
    await user.type(screen.getByLabelText('이메일'), 'nobody@reused.dev')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    // 계정 존재 여부가 오류 메시지로 드러나지 않아야 한다(NFR-AUTH-018)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    )
  })

  it('AUTH-001 비밀번호 표시 토글이 입력 종류를 바꾼다', async () => {
    const user = userEvent.setup()
    renderRoute('/login/email')

    const password = screen.getByLabelText('비밀번호')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '비밀번호 표시' }))
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'text')
  })

  it('AUTH-004 이메일 가입은 닉네임 중복확인과 약관 2건을 통과해야 열리고, 가입 후 이메일 인증 화면으로 간다', async () => {
    const user = userEvent.setup()
    renderRoute('/signup/email')

    const submit = () => screen.getByRole('button', { name: 'Sign Up' })
    expect(submit()).toBeDisabled()
    // 이메일에는 중복확인 버튼이 없다 — 가입 여부가 드러나면 안 되므로 닉네임 것 하나만 있다
    expect(screen.getAllByRole('button', { name: '중복확인' })).toHaveLength(1)

    await user.type(screen.getByLabelText('Email'), 'new@reused.dev')

    await user.type(screen.getByLabelText('Password'), 'short')
    expect(screen.getByText('* 비밀번호는 8자 이상이어야 합니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'newpass1234')
    await user.type(screen.getByLabelText('Password Confirm'), 'newpass9999')
    expect(screen.getByText('* 비밀번호가 일치하지 않습니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password Confirm'))
    await user.type(screen.getByLabelText('Password Confirm'), 'newpass1234')

    await user.type(screen.getByLabelText('Nickname'), '새사용자')
    await user.click(screen.getByRole('button', { name: '중복확인' }))
    expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()

    expect(submit()).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
    expect(submit()).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))

    await user.click(submit())
    expect(
      await screen.findByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('새사용자')
  })

  it('AUTH-004 이미 가입된 이메일은 가입 요청의 409로만 알린다', async () => {
    const user = userEvent.setup()
    renderRoute('/signup/email')

    await signUpByEmail(user, 'test@reused.dev', '새사용자')

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입된 이메일입니다.')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('AUTH-004 가입 직후 발송된 코드로 이메일 소유를 확인한다', async () => {
    const user = userEvent.setup()
    renderRoute('/signup/email')
    await signUpByEmail(user, 'new@reused.dev', '새사용자')
    await screen.findByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' })

    // 인증 화면은 본인 정보의 주소를 보여 준다
    expect(screen.getByText(/new@reused\.dev 주소로/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('인증코드'), issuedVerificationCode())
    await user.click(screen.getByRole('button', { name: '인증하기' }))

    expect(
      await screen.findByRole('heading', { name: '이메일 인증이 완료되었습니다' }),
    ).toBeInTheDocument()
  })

  it('AUTH-004 틀린 인증코드는 거부하고, 다시 보내기로 새 코드를 받을 수 있다', async () => {
    const user = userEvent.setup()
    renderRoute('/signup/email')
    await signUpByEmail(user, 'new@reused.dev', '새사용자')
    await screen.findByRole('heading', { name: '메일로 보낸 인증코드를 입력해 주세요' })

    const first = issuedVerificationCode()
    await user.type(screen.getByLabelText('인증코드'), first === '000000' ? '000001' : '000000')
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '인증 코드가 올바르지 않거나 만료되었습니다.',
    )

    await user.click(screen.getByRole('button', { name: '다시 보내기' }))
    expect(await screen.findByRole('status')).toHaveTextContent('인증코드를 다시 보냈습니다.')

    await user.type(screen.getByLabelText('인증코드'), issuedVerificationCode())
    await user.click(screen.getByRole('button', { name: '인증하기' }))
    expect(
      await screen.findByRole('heading', { name: '이메일 인증이 완료되었습니다' }),
    ).toBeInTheDocument()
  })

  it('AUTH-004 이메일 인증 화면은 비로그인이면 로그인으로 보낸다', async () => {
    renderRoute('/verify-email')

    expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 필요합니다.')
  })

  it('AUTH-003 인증코드로 비밀번호를 바꾸고 새 비밀번호로 로그인한다', async () => {
    const user = userEvent.setup()
    renderRoute('/password/reset')

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.click(screen.getByRole('button', { name: '인증코드 보내기' }))
    // 코드는 화면에 노출되지 않고 메일로만 간다
    expect(await screen.findByRole('status')).toHaveTextContent('인증코드를 보냈습니다.')
    expect(screen.queryByText(/발급된 인증코드/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('인증코드'), issuedResetCode('test@reused.dev'))
    await user.type(screen.getByLabelText('새 비밀번호'), 'brandnew1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: '변경하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.',
    )

    await user.type(screen.getByLabelText('이메일'), 'test@reused.dev')
    await user.type(screen.getByLabelText('비밀번호'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
  })

  it('AUTH-003 가입되지 않은 이메일도 발송 요청은 성공으로 보인다', async () => {
    const user = userEvent.setup()
    renderRoute('/password/reset')

    await user.type(screen.getByLabelText('Email'), 'nobody@reused.dev')
    await user.click(screen.getByRole('button', { name: '인증코드 보내기' }))

    // 계정 유무가 화면 응답으로 드러나지 않는다(NFR-AUTH-018)
    expect(await screen.findByRole('status')).toHaveTextContent('인증코드를 보냈습니다.')
    expect(mockAuthRepository.peekResetCode('nobody@reused.dev')).toBeNull()
  })

  it('AUTH-003 틀린 인증코드는 거부한다', async () => {
    const user = userEvent.setup()
    renderRoute('/password/reset')

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.click(screen.getByRole('button', { name: '인증코드 보내기' }))
    await screen.findByRole('status')

    await user.type(screen.getByLabelText('인증코드'), '000000')
    await user.type(screen.getByLabelText('새 비밀번호'), 'brandnew1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: '변경하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '인증 코드가 올바르지 않거나 만료되었습니다.',
    )
  })
})
