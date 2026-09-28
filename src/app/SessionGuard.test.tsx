import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { useAuthStore } from '@/features/auth/model/authStore'

// 실제 인증 모드. 인증 API는 fetch 대역이 답하고, 다른 도메인은 목 저장소를 그대로 쓴다.
vi.mock('@/features/auth/lib/authMode', () => ({ usesAuthMocks: false, usesKakaoStub: true }))

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubAuthServer({ session, role = 'USER' }: { session: boolean; role?: 'USER' | 'ADMIN' }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 })
    if (url.endsWith('/auth/refresh')) {
      return session
        ? json({ accessToken: 'restored-token' })
        : json({ code: 'UNAUTHENTICATED', message: 'Refresh Token이 없습니다.' }, 401)
    }
    if (url.endsWith('/users/me')) {
      return json({
        userId: 1,
        nickname: '재현',
        profileImageUrl: null,
        bio: null,
        role,
        status: 'ACTIVE',
        suspendedUntil: null,
        provider: 'LOCAL',
        email: 'user@example.com',
        emailVerified: true,
        createdAt: '2026-09-01T00:00:00Z',
      })
    }
    return json({ code: 'NOT_FOUND', message: '없는 경로' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('세션 복구와 로그인 가드', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('COM-001 새로고침한 뒤에도 Refresh 쿠키가 있으면 세션을 되살려 보호 화면을 연다', async () => {
    const fetchMock = stubAuthServer({ session: true })

    renderRoute('/wishes')

    expect(await screen.findByRole('heading', { name: '관심 상품' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBe('restored-token')
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('세션이 없으면 보호 화면 대신 로그인으로 보내고 이유를 알린다', async () => {
    stubAuthServer({ session: false })

    renderRoute('/trades')

    expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 필요합니다.')
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument()
  })

  it('공개 화면은 세션이 없어도 연다', async () => {
    stubAuthServer({ session: false })

    renderRoute('/')

    expect(
      await screen.findByRole('heading', { name: '아이패드 프로 11형 · 키보드 포함' }),
    ).toBeInTheDocument()
  })

  it('로그아웃 등으로 세션이 비면 보호 화면에서 바로 로그인으로 나간다', async () => {
    stubAuthServer({ session: true })
    renderRoute('/wishes')
    expect(await screen.findByRole('heading', { name: '관심 상품' })).toBeInTheDocument()

    act(() => useAuthStore.getState().clear())

    expect(await screen.findByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument()
  })

  it('MY-001-D1 로그아웃하면 가드 안내가 아니라 로그아웃 완료 안내를 보여 준다', async () => {
    const fetchMock = stubAuthServer({ session: true })
    const user = userEvent.setup()
    renderRoute('/me')

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByText('로그아웃되었습니다.')).toBeInTheDocument()
    expect(screen.queryByText('로그인이 필요합니다.')).not.toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/logout'))).toHaveLength(1)
  })

  it('관리자가 아닌 회원에게는 관리자 화면을 열지 않는다', async () => {
    stubAuthServer({ session: true, role: 'USER' })

    renderRoute('/admin/listings')

    expect(
      await screen.findByRole('heading', { name: '관리자 권한이 필요합니다' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '게시글 관리' })).not.toBeInTheDocument()
  })

  it('ADMIN 회원은 관리자 화면에 들어간다', async () => {
    stubAuthServer({ session: true, role: 'ADMIN' })

    renderRoute('/admin/listings')

    expect(await screen.findByRole('heading', { name: '게시글 관리' })).toBeInTheDocument()
    expect(screen.queryByText('Mock ADMIN')).not.toBeInTheDocument()
  })
})
