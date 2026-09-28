import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { AdminCredentialStatusPage } from '@/features/admin/pages/AdminCredentialStatusPage'

describe('관리자 인증정보 상태', () => {
  afterEach(() => vi.restoreAllMocks())

  it('설정 존재와 사용 여부만 표시한다', async () => {
    vi.spyOn(adminOperationsApi, 'credentialStatus').mockResolvedValue({ credentials: [
      { service: 'JWT', configured: true, enabled: true, source: 'APPLICATION_CONFIGURATION' },
      { service: 'LLM', configured: false, enabled: false, source: 'APPLICATION_CONFIGURATION' },
    ] })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminCredentialStatusPage />
    </QueryClientProvider>)
    expect(await screen.findByRole('cell', { name: '인증 토큰' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '외부 LLM' })).toBeInTheDocument()
    expect(screen.getAllByRole('cell', { name: '애플리케이션 설정' })).toHaveLength(2)
    expect(screen.getByText('비밀번호·토큰·키의 값은 이 화면이나 API에서 조회할 수 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText(/JWT_SECRET|LLM_API_KEY|Bearer /)).not.toBeInTheDocument()
  })
})
