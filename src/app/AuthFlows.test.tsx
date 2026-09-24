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

describe('개발자 B 인증 흐름', () => {
  beforeEach(() => {
    mockAuthRepository.reset()
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
    sessionStorage.clear()
    localStorage.clear()
  })

  it('COM-001 재발급할 세션이 없으면 로그인 화면으로 보낸다', async () => {
    renderRoute('/splash')

    // 버튼 라벨은 화면설계서 표기를 따른다
    expect(
      await screen.findByRole('button', { name: '카카오로 시작하기' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('AUTH-001 가입된 인가 코드는 바로 로그인되고 토큰이 메모리에 담긴다', async () => {
    renderRoute('/oauth/callback?code=local-member')

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()

    const session = useAuthStore.getState()
    expect(session.accessToken).toMatch(/^access\./)
    expect(session.user?.nickname).toBe('재현')
  })

  it('AUTH-001 처음 보는 인가 코드는 온보딩으로 보내고 가입 토큰을 넘긴다', async () => {
    renderRoute('/oauth/callback?code=local-first-visit')

    expect(
      await screen.findByRole('heading', { name: '사용할 닉네임을 정해 주세요' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().signupToken).toMatch(/^signup-local-first-visit/)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('AUTH-001 state가 어긋난 콜백은 로그인으로 되돌린다', async () => {
    sessionStorage.setItem('kakao_oauth_state', 'expected-state')
    renderRoute('/oauth/callback?code=local-member&state=forged-state')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 요청이 올바르지 않습니다. 다시 시도해 주세요.',
    )
  })

  it('AUTH-002 중복확인 결과를 표시하고 약관 2건에 동의해야 가입할 수 있다', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ signupToken: 'signup-local-first-visit.token' })
    renderRoute('/onboarding')

    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled()
    // 닉네임이 없으면 중복확인부터 막힌다
    expect(screen.getByRole('button', { name: '중복확인' })).toBeDisabled()

    await user.type(screen.getByLabelText('닉네임'), '재현')
    await user.click(screen.getByRole('button', { name: '중복확인' }))
    expect(await screen.findByText('* 이미 사용 중인 닉네임입니다')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('닉네임'))
    await user.type(screen.getByLabelText('닉네임'), '새로운닉네임')
    await user.click(screen.getByRole('button', { name: '중복확인' }))
    expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()

    // 중복확인을 통과해도 약관 2건을 모두 동의해야 제출할 수 있다
    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled()
    await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))

    await user.click(screen.getByRole('button', { name: '시작하기' }))
    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('새로운닉네임')
  })

  it('AUTH-002 닉네임을 고치면 이전 중복확인 결과는 무효가 된다', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ signupToken: 'signup-local-first-visit.token' })
    renderRoute('/onboarding')

    await user.type(screen.getByLabelText('닉네임'), '사용가능닉')
    await user.click(screen.getByRole('button', { name: '중복확인' }))
    expect(await screen.findByText('사용할 수 있는 닉네임입니다')).toBeInTheDocument()

    await user.click(screen.getByLabelText('[필수] 서비스 이용약관 동의'))
    await user.click(screen.getByLabelText('[필수] 개인정보 처리방침 동의'))
    expect(screen.getByRole('button', { name: '시작하기' })).toBeEnabled()

    await user.type(screen.getByLabelText('닉네임'), '변경')
    expect(screen.queryByText('사용할 수 있는 닉네임입니다')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled()
  })

  it('AUTH-002 가입 토큰 없이 접근하면 로그인으로 보낸다', async () => {
    renderRoute('/onboarding')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '가입 절차가 만료되었습니다. 다시 로그인해 주세요.',
    )
  })
})
