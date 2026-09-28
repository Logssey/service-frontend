import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '@/features/auth/api/authApi'
import { AdminAccessBoundary } from '@/features/admin/components/AdminAccessBoundary'

vi.mock('@/features/auth/lib/authMode', () => ({ usesAuthMocks: false }))

const baseProfile = {
  userId: 1, nickname: '테스트 사용자', profileImageUrl: null, bio: null,
  status: 'ACTIVE' as const, suspendedUntil: null,
  provider: 'LOCAL' as const, email: 'test@example.test', emailVerified: true,
  createdAt: '2026-01-10T03:00:00Z',
}

function renderBoundary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><AdminAccessBoundary><h1>운영자 화면</h1></AdminAccessBoundary></MemoryRouter></QueryClientProvider>)
}

describe('관리자 접근 경계', () => {
  afterEach(() => vi.restoreAllMocks())

  it('일반 회원은 관리자 화면에 접근하지 못한다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ ...baseProfile, role: 'USER' })
    renderBoundary()
    expect(await screen.findByRole('heading', { name: '관리자 권한이 필요합니다' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '운영자 화면' })).not.toBeInTheDocument()
  })

  it('서버가 ADMIN으로 확인한 회원만 화면을 본다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ ...baseProfile, role: 'ADMIN' })
    renderBoundary()
    expect(await screen.findByRole('heading', { name: '운영자 화면' })).toBeInTheDocument()
  })
})
