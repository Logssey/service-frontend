import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportsApi } from '@/features/reports/api/reportsApi'
import { ReportFormPage } from '@/features/reports/pages/ReportFormPage'

function renderForm(path: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/reports/new" element={<ReportFormPage />} />
    <Route path="/reports/me" element={<h1>내 신고 내역</h1>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('신고 접수', () => {
  afterEach(() => vi.restoreAllMocks())

  it('메시지에는 서버가 허용하는 사유만 노출하고 제출한다', async () => {
    const create = vi.spyOn(reportsApi, 'create').mockResolvedValue({ reportId: 17 })
    const user = userEvent.setup()
    renderForm('/reports/new?targetType=MESSAGE&targetId=7')
    expect(screen.queryByRole('option', { name: '금지 품목' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('사유'), 'ABUSIVE_BEHAVIOR')
    await user.type(screen.getByLabelText('상세 내용 (선택)'), '욕설이 담긴 메시지')
    await user.click(screen.getByRole('button', { name: '신고 접수' }))
    expect(create).toHaveBeenCalledWith('MESSAGE', 7, 'ABUSIVE_BEHAVIOR', '욕설이 담긴 메시지')
    expect(await screen.findByRole('heading', { name: '내 신고 내역' })).toBeInTheDocument()
  })

  it('잘못된 신고 대상은 전송하지 않는다', () => {
    const create = vi.spyOn(reportsApi, 'create')
    renderForm('/reports/new?targetType=LISTING&targetId=0')
    expect(screen.getByRole('alert')).toHaveTextContent('신고 대상을 확인할 수 없습니다')
    expect(create).not.toHaveBeenCalled()
  })
})
