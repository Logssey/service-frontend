import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { listingsApi } from '@/features/listings/api/listingsApi'
import type {
  ListingDetailResponse,
  ListingSummaryResponse,
} from '@/features/listings/model/types'

const listing: ListingSummaryResponse = {
  listingId: 900,
  title: '사진 없는 게시글',
  price: 12000,
  status: 'ON_SALE',
  itemCondition: 'USED',
  thumbnailUrl: null,
  wishCount: 0,
  seller: { userId: 7, nickname: '판매자', profileImageUrl: null },
  createdAt: '2026-09-24T00:00:00Z',
}

const detail: ListingDetailResponse = {
  ...listing,
  description: '사진 없이 등록한 상품입니다.',
  tradeMethod: 'DIRECT',
  category: { categoryId: 1, name: '디지털기기' },
  images: [],
  viewCount: 0,
  isWished: false,
  isMine: false,
  seller: { ...listing.seller, completedTradeCount: 0, averageRating: null },
}

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

describe('사진 없는 게시글', () => {
  afterEach(() => vi.restoreAllMocks())

  it('목록에서 null 썸네일을 대체 이미지로 표시한다', async () => {
    vi.spyOn(listingsApi, 'getCategories').mockResolvedValue([])
    vi.spyOn(listingsApi, 'getListings').mockResolvedValue({
      items: [listing],
      nextCursor: null,
      hasNext: false,
    })

    renderRoute('/')

    expect(await screen.findByRole('heading', { name: listing.title })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: `${listing.title} 상품 사진 없음` }),
    ).toHaveClass('product-image--placeholder')
  })

  it('상세에서 가짜 상품 사진이나 평점 없이 내용을 표시한다', async () => {
    vi.spyOn(listingsApi, 'getListing').mockResolvedValue(detail)

    renderRoute(`/listings/${listing.listingId}`)

    expect(await screen.findByRole('heading', { name: listing.title })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: `${listing.title} 상품 사진 없음` }),
    ).toHaveClass('product-image--placeholder')
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
    expect(screen.getByText(/평점 없음/)).toBeInTheDocument()
  })
})
