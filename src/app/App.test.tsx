import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '@/app/App'
import {
  initialListingFilters,
  useListingFilterStore,
} from '@/features/listings/model/listingStore'

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

describe('개발자 A 1단계 상품 탐색 흐름', () => {
  beforeEach(() => {
    useListingFilterStore.setState(initialListingFilters)
  })

  it('홈에서 카테고리와 상품 목록을 불러온다', async () => {
    renderRoute('/')

    expect(
      screen.getByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '디지털기기' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: '아이패드 프로 11형 · 키보드 포함',
      }),
    ).toBeInTheDocument()
  })

  it('검색 화면에서 카테고리 필터를 적용하고 홈 결과를 갱신한다', async () => {
    const user = userEvent.setup()
    renderRoute('/search')

    const category = await screen.findByRole('button', { name: '가구·인테리어' })
    await user.click(category)
    await user.click(screen.getByRole('button', { name: '적용하기' }))

    expect(
      await screen.findByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: '아이패드 프로 11형 · 키보드 포함',
        }),
      ).not.toBeInTheDocument()
    })
  })

  it('상품 상세에서 판매 상태와 판매자 신뢰 정보를 보여준다', async () => {
    renderRoute('/listings/101')

    expect(
      await screen.findByRole('heading', {
        name: '아이패드 프로 11형 · 키보드 포함',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('판매중')).toBeInTheDocument()
    expect(screen.getByText(/거래 23회/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '거래 요청' })).toBeEnabled()
  })
})
