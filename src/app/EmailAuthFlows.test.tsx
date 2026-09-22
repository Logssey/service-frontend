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

    expect(screen.getByRole('button', { name: 'Log In' })).toBeDisabled()

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.type(screen.getByLabelText('Password'), 'test1234')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('테스트계정')
  })

  it('AUTH-001 이메일이 없을 때와 비밀번호가 틀릴 때의 응답이 같다', async () => {
    const user = userEvent.setup()
    renderRoute('/login')

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    const wrongPassword = await screen.findByRole('alert')
    expect(wrongPassword).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'nobody@reused.dev')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    // 계정 존재 여부가 오류 메시지로 드러나지 않아야 한다
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    )
  })

  it('AUTH-001 비밀번호 표시 토글이 입력 종류를 바꾼다', async () => {
    const user = userEvent.setup()
    renderRoute('/login')

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Password 표시' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('AUTH-004 이메일 가입은 중복확인 2건과 약관 2건을 모두 통과해야 열린다', async () => {
    const user = userEvent.setup()
    renderRoute('/signup/email')

    const submit = () => screen.getByRole('button', { name: 'Sign Up' })
    expect(submit()).toBeDisabled()

    // 이미 가입된 이메일
    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.click(screen.getAllByRole('button', { name: '중복확인' })[0])
    expect(await screen.findByText('* 이미 가입된 이메일입니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'new@reused.dev')
    await user.click(screen.getAllByRole('button', { name: '중복확인' })[0])
    expect(await screen.findByText('사용할 수 있는 이메일입니다')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password'), 'short')
    expect(screen.getByText('* 비밀번호는 8자 이상이어야 합니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'newpass1234')
    await user.type(screen.getByLabelText('Password Confirm'), 'newpass9999')
    expect(screen.getByText('* 비밀번호가 일치하지 않습니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password Confirm'))
    await user.type(screen.getByLabelText('Password Confirm'), 'newpass1234')

    await user.type(screen.getByLabelText('Nickname'), '새사용자')
    await user.click(screen.getAllByRole('button', { name: '중복확인' })[1])
    expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()

    expect(submit()).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
    expect(submit()).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))

    await user.click(submit())
    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('새사용자')
  })

  it('AUTH-003 인증코드로 비밀번호를 바꾸고 새 비밀번호로 로그인한다', async () => {
    const user = userEvent.setup()
    renderRoute('/password/reset')

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.click(screen.getByRole('button', { name: '인증코드 보내기' }))

    const notice = await screen.findByText(/발급된 인증코드/)
    const issued = notice.textContent?.match(/\d{6}/)?.[0] ?? ''
    expect(issued).toHaveLength(6)

    await user.type(screen.getByLabelText('인증코드'), issued)
    await user.type(screen.getByLabelText('새 비밀번호'), 'brandnew1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: '변경하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.',
    )

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.type(screen.getByLabelText('Password'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
  })

  it('AUTH-003 틀린 인증코드는 거부한다', async () => {
    const user = userEvent.setup()
    renderRoute('/password/reset')

    await user.type(screen.getByLabelText('Email'), 'test@reused.dev')
    await user.click(screen.getByRole('button', { name: '인증코드 보내기' }))
    await screen.findByText(/발급된 인증코드/)

    await user.type(screen.getByLabelText('인증코드'), '000000')
    await user.type(screen.getByLabelText('새 비밀번호'), 'brandnew1234')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'brandnew1234')
    await user.click(screen.getByRole('button', { name: '변경하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '인증코드가 올바르지 않거나 만료되었습니다.',
    )
  })
})
