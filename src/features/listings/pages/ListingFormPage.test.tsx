import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { listingsApi } from '@/features/listings/api/listingsApi'
import { ListingFormPage } from '@/features/listings/pages/ListingFormPage'

afterEach(() => vi.restoreAllMocks())

it('카테고리 조회에 실패하면 이유를 표시하고 재시도로 선택지를 복구한다', async () => {
  const user = userEvent.setup()
  vi.spyOn(listingsApi, 'getCategories')
    .mockRejectedValueOnce(new Error('서버 연결 실패'))
    .mockResolvedValueOnce([{ categoryId: 3, name: '의류' }])

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ListingFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  const categorySelect = screen.getByRole('combobox', { name: '카테고리' })
  expect(categorySelect).toBeDisabled()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '카테고리를 불러오지 못했습니다.',
  )

  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await within(categorySelect).findByRole('option', { name: '의류' })).toBeInTheDocument()
  expect(categorySelect).toBeEnabled()
  await user.selectOptions(categorySelect, '3')
  expect(categorySelect).toHaveValue('3')
})
