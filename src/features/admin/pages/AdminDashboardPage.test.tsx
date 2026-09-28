import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><AdminDashboardPage /></MemoryRouter></QueryClientProvider>)
}

describe('관리자 챗봇 설정', () => {
  afterEach(() => vi.restoreAllMocks())

  it('환경 스위치가 꺼지면 관리자 변경을 제한한다', async () => {
    vi.spyOn(adminOperationsApi, 'dashboard').mockResolvedValue({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, totalListings: 0, onSaleListings: 0, completedTrades: 0, pendingReports: 0 })
    vi.spyOn(adminOperationsApi, 'chatbot').mockResolvedValue({ enabled: false, adminEnabled: false, environmentEnabled: false, freeInputEnabled: false })
    renderDashboard()
    expect(await screen.findByRole('checkbox', { name: '추천 질문 챗봇 사용' })).toBeDisabled()
    expect(screen.getByText(/CHATBOT_ENABLED/)).toBeInTheDocument()
  })

  it('관리자가 추천 질문 챗봇을 켜고 끌 수 있다', async () => {
    vi.spyOn(adminOperationsApi, 'dashboard').mockResolvedValue({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, totalListings: 0, onSaleListings: 0, completedTrades: 0, pendingReports: 0 })
    vi.spyOn(adminOperationsApi, 'chatbot').mockResolvedValue({ enabled: false, adminEnabled: false, environmentEnabled: true, freeInputEnabled: false })
    const update = vi.spyOn(adminOperationsApi, 'updateChatbot').mockResolvedValue({ enabled: true, adminEnabled: true, environmentEnabled: true, freeInputEnabled: false })
    renderDashboard()
    await userEvent.click(await screen.findByRole('checkbox', { name: '추천 질문 챗봇 사용' }))
    expect(update).toHaveBeenCalledWith(true)
  })
})
