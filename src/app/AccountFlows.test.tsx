import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { accountApi } from '@/features/account/api/accountApi'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import type { MyProfileResponse } from '@/features/auth/model/types'
import { mockAuthRepository } from '@/mocks/authRepository'
import { mockTradeRepository } from '@/mocks/tradeRepository'
import { ApiClientError } from '@/shared/api/http'
import { useToastStore } from '@/shared/state/toastStore'

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

/** 대역 카카오 계정 '재현'(userId 3)으로 로그인한 상태를 만든다. 거래 목도 이 회원 기준이다. */
async function signInWithKakao() {
  const login = await mockAuthRepository.oauthLogin('kakao', 'local-member')
  useAuthStore.setState({ accessToken: login.accessToken, user: login.user })
}

function profile(overrides: Partial<MyProfileResponse>): MyProfileResponse {
  return {
    userId: 11,
    nickname: '테스트계정',
    profileImageUrl: null,
    bio: null,
    role: 'USER',
    status: 'ACTIVE',
    suspendedUntil: null,
    provider: 'LOCAL',
    email: 'test@reused.dev',
    emailVerified: true,
    createdAt: '2026-01-10T03:00:00Z',
    ...overrides,
  }
}

async function countOngoingTradesOfMockUser() {
  let count = 0
  for (const role of ['buyer', 'seller'] as const) {
    for (const status of ['REQUESTED', 'ACCEPTED'] as const) {
      count += (await mockTradeRepository.getTrades({ role, status, size: 100 })).items.length
    }
  }
  return count
}

describe('개발자 B 마이페이지 계정', () => {
  beforeEach(() => {
    mockAuthRepository.reset()
    mockTradeRepository.reset()
    useAuthStore.setState({ accessToken: null, user: null, signupToken: null })
    useToastStore.setState({ message: null })
  })

  afterEach(() => vi.restoreAllMocks())

  describe('MY-001 마이페이지', () => {
    it('프로필에 평점·거래 수를 함께 보이고 활동 메뉴를 기존 화면에 연결한다', async () => {
      await signInWithKakao()
      renderRoute('/me')

      expect(await screen.findByText('재현')).toBeInTheDocument()
      expect(await screen.findByText('★ 4.7 · 거래 12회')).toBeInTheDocument()

      const menu = screen.getByRole('navigation', { name: '마이페이지 메뉴' })
      expect(within(menu).getByRole('link', { name: '판매 관리' })).toHaveAttribute('href', '/me/activity')
      expect(within(menu).getByRole('link', { name: '거래 내역' })).toHaveAttribute('href', '/trades')
      expect(within(menu).getByRole('link', { name: '찜 목록' })).toHaveAttribute('href', '/wishes')
      expect(within(menu).getByRole('link', { name: '받은 후기' })).toHaveAttribute(
        'href',
        '/me/activity?tab=reviews',
      )
      expect(screen.getByRole('link', { name: '회원 탈퇴' })).toHaveAttribute('href', '/me/withdraw')
      expect(screen.getByRole('link', { name: 'MY' })).toHaveClass('is-active')
    })

    it('카카오 계정에는 비밀번호 변경이 없고 배너도 없다', async () => {
      await signInWithKakao()
      renderRoute('/me')

      expect(await screen.findByText('재현')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /비밀번호 변경/ })).not.toBeInTheDocument()
      expect(screen.queryByText(/이용정지 중/)).not.toBeInTheDocument()
      expect(screen.queryByText('이메일 인증이 필요해요')).not.toBeInTheDocument()
    })

    it('이메일 계정은 비밀번호 변경을 보이고, 정지·미인증 배너를 정지 먼저 보인다', async () => {
      vi.spyOn(authApi, 'me').mockResolvedValue(
        profile({
          status: 'SUSPENDED',
          suspendedUntil: new Date(Date.now() + 86_400_000).toISOString(),
          email: 'jae@example.com',
          emailVerified: false,
        }),
      )
      renderRoute('/me')

      const suspension = await screen.findByText(/^이용정지 중 · .+까지$/)
      const verification = screen.getByText('이메일 인증이 필요해요')
      expect(
        suspension.compareDocumentPosition(verification) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(screen.getByText('jae@example.com')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '인증하기' })).toHaveAttribute('href', '/verify-email')
      expect(screen.getByRole('link', { name: /비밀번호 변경/ })).toHaveAttribute('href', '/me/settings')
    })

    it('정지 기간이 이미 지났으면 status가 남아 있어도 배너를 보이지 않는다', async () => {
      vi.spyOn(authApi, 'me').mockResolvedValue(
        profile({
          status: 'SUSPENDED',
          suspendedUntil: new Date(Date.now() - 60_000).toISOString(),
        }),
      )
      renderRoute('/me')

      expect(await screen.findByText('테스트계정')).toBeInTheDocument()
      expect(screen.queryByText(/이용정지 중/)).not.toBeInTheDocument()
    })

    it('무기한 정지는 해제될 때까지로 표시한다', async () => {
      vi.spyOn(authApi, 'me').mockResolvedValue(
        profile({ status: 'SUSPENDED', suspendedUntil: null }),
      )
      renderRoute('/me')

      expect(await screen.findByText('이용정지 중 · 해제될 때까지')).toBeInTheDocument()
    })

    it('신고·차단·알림·공지를 구현된 화면으로 연결한다', async () => {
      await signInWithKakao()
      renderRoute('/me')

      const menu = await screen.findByRole('navigation', { name: '마이페이지 메뉴' })
      expect(within(menu).getByRole('link', { name: '내 신고 내역' })).toHaveAttribute('href', '/reports/me')
      expect(within(menu).getByRole('link', { name: '차단 목록' })).toHaveAttribute('href', '/blocks')
      expect(within(menu).getByRole('link', { name: '알림' })).toHaveAttribute('href', '/notifications')
      expect(within(menu).getByRole('link', { name: '공지사항' })).toHaveAttribute('href', '/notices')
    })

    it('세션이 없으면 로그인 화면으로 보낸다', async () => {
      renderRoute('/me')

      expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 필요합니다.')
    })
  })

  describe('MY-001-D1 로그아웃', () => {
    it('확인하면 세션과 캐시를 비우고 로그인 화면에 완료 안내를 보인다', async () => {
      const user = userEvent.setup()
      const me = vi.spyOn(authApi, 'me')
      await signInWithKakao()
      const { queryClient } = renderRoute('/me')

      await user.click(await screen.findByRole('button', { name: '로그아웃' }))
      const dialog = screen.getByRole('dialog', { name: '로그아웃할까요?' })
      await user.click(within(dialog).getByRole('button', { name: '로그아웃' }))

      expect(await screen.findByText('로그아웃되었습니다.')).toHaveAttribute('role', 'status')
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
      // 끝낸 세션으로 내 정보를 다시 부르지 않는다
      expect(me).toHaveBeenCalledTimes(1)
      await expect(mockAuthRepository.refresh()).rejects.toMatchObject({ status: 401 })
    })

    it('취소·Esc로 닫으면 로그아웃하지 않는다', async () => {
      const user = userEvent.setup()
      const logout = vi.spyOn(authApi, 'logout')
      await signInWithKakao()
      renderRoute('/me')

      await user.click(await screen.findByRole('button', { name: '로그아웃' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '로그아웃' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(logout).not.toHaveBeenCalled()
    })

    it('서버가 실패하면 로그인 상태를 유지하고 다시 시도하게 한다', async () => {
      const user = userEvent.setup()
      vi.spyOn(authApi, 'logout').mockRejectedValue(
        new ApiClientError(500, 'INTERNAL_ERROR', '서버 오류'),
      )
      await signInWithKakao()
      renderRoute('/me')

      await user.click(await screen.findByRole('button', { name: '로그아웃' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '로그아웃' }))

      expect(await screen.findByText('재현')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(useToastStore.getState().message).toBe('로그아웃하지 못했어요. 다시 시도해 주세요.')
      expect(useAuthStore.getState().accessToken).not.toBeNull()
    })
  })

  describe('MY-003 회원 탈퇴', () => {
    it('취소될 거래를 보이고, 확인해야 탈퇴하며, 같은 카카오 계정은 새로 가입하게 된다', async () => {
      const user = userEvent.setup()
      const expected = await countOngoingTradesOfMockUser()
      expect(expected).toBeGreaterThan(0)
      const ongoing = vi.spyOn(accountApi, 'getOngoingTrades')
      await signInWithKakao()
      const { queryClient } = renderRoute('/me/withdraw')

      expect(
        await screen.findByRole('heading', { name: `진행 중인 거래 ${expected}건` }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /상품 사진/ })).toHaveLength(expected)
      expect(screen.getByText('다시 가입하면 새 계정으로 시작됩니다')).toBeInTheDocument()

      const submit = screen.getByRole('button', { name: '탈퇴하기' })
      expect(submit).toBeDisabled()
      await user.click(screen.getByLabelText('안내 내용을 모두 확인했습니다'))
      await user.click(submit)

      expect(await screen.findByText('회원 탈퇴가 완료되었습니다.')).toHaveAttribute('role', 'status')
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
      expect(ongoing).toHaveBeenCalledTimes(1)
      const again = await mockAuthRepository.oauthLogin('kakao', 'local-member')
      expect(again.status).toBe('SIGNUP_REQUIRED')
    })

    it('취소될 거래가 없으면 없다고 알린다', async () => {
      vi.spyOn(accountApi, 'getOngoingTrades').mockResolvedValue({ items: [], hasMore: false })
      await signInWithKakao()
      renderRoute('/me/withdraw')

      expect(await screen.findByText('취소될 거래가 없습니다')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '진행 중인 거래 0건' })).toBeInTheDocument()
    })

    it('거래 미리 보기가 실패해도 탈퇴는 막지 않는다', async () => {
      const user = userEvent.setup()
      vi.spyOn(accountApi, 'getOngoingTrades').mockRejectedValue(
        new ApiClientError(500, 'INTERNAL_ERROR', '서버 오류'),
      )
      await signInWithKakao()
      renderRoute('/me/withdraw')

      expect(await screen.findByText('거래 정보를 불러오지 못했어요.')).toBeInTheDocument()
      await user.click(screen.getByLabelText('안내 내용을 모두 확인했습니다'))
      expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeEnabled()
    })

    it('관리자 계정은 탈퇴할 수 없다고 알리고 버튼을 막는다', async () => {
      const user = userEvent.setup()
      vi.spyOn(authApi, 'withdraw').mockRejectedValue(
        new ApiClientError(403, 'FORBIDDEN', '권한이 없습니다.'),
      )
      await signInWithKakao()
      renderRoute('/me/withdraw')

      await user.click(await screen.findByLabelText('안내 내용을 모두 확인했습니다'))
      await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('관리자 계정은 탈퇴할 수 없습니다.')
      expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeDisabled()
      expect(useAuthStore.getState().accessToken).not.toBeNull()
    })

    it('일시적인 실패는 다시 누를 수 있게 둔다', async () => {
      const user = userEvent.setup()
      vi.spyOn(authApi, 'withdraw').mockRejectedValue(new TypeError('Failed to fetch'))
      await signInWithKakao()
      renderRoute('/me/withdraw')

      await user.click(await screen.findByLabelText('안내 내용을 모두 확인했습니다'))
      await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeEnabled()
    })
  })
})
