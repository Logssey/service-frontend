import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApi } from '@/features/chat/api/chatApi'
import { ChatRoomPage } from '@/features/chat/pages/ChatRoomPage'
import { listingsApi } from '@/features/listings/api/listingsApi'
import type { ListingDetailResponse } from '@/features/listings/model/types'
import { tradesApi } from '@/features/trades/api/tradesApi'

const room = {
  chatRoomId: 17,
  listing: { listingId: 7, title: '테스트 상품', price: 12000, thumbnailUrl: '' },
  counterparty: { userId: 4, nickname: '판매자', profileImageUrl: null },
  lastMessage: '안녕하세요',
  lastMessageAt: '2026-09-28T00:00:00Z',
  unreadCount: 0,
  tradeId: null,
}

const listing: ListingDetailResponse = {
  listingId: 7,
  title: '테스트 상품',
  description: '거래 가능한 상품',
  price: 12000,
  status: 'ON_SALE',
  itemCondition: 'USED',
  tradeMethod: 'DIRECT',
  category: { categoryId: 1, name: '기타' },
  images: [],
  wishCount: 0,
  viewCount: 0,
  isWished: false,
  isMine: false,
  seller: { userId: 4, nickname: '판매자', profileImageUrl: null, completedTradeCount: 0, averageRating: null },
  createdAt: '2026-09-28T00:00:00Z',
}

function renderRoom() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/chat/17']}>
        <Routes>
          <Route path="/chat/:chatRoomId" element={<ChatRoomPage />} />
          <Route path="/trades/:tradeId" element={<p>거래 상세 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('채팅방 거래 및 신고 흐름', () => {
  afterEach(() => vi.restoreAllMocks())

  it('거래가 없으면 구매자가 거래를 요청할 수 있고 메시지를 신고할 수 있다', async () => {
    vi.spyOn(chatApi, 'getChatRoomSummary').mockResolvedValue(room)
    vi.spyOn(chatApi, 'getMessages').mockResolvedValue({
      items: [{ messageId: 31, senderId: 4, content: '안녕하세요', isMine: false, isDeleted: false, readAt: null, createdAt: '2026-09-28T00:00:00Z' }],
      nextCursor: null, hasNext: false,
    })
    vi.spyOn(listingsApi, 'getListing').mockResolvedValue(listing)
    const createTrade = vi.spyOn(tradesApi, 'createTrade').mockResolvedValue({ tradeId: 99, status: 'REQUESTED' })

    renderRoom()

    expect(await screen.findByRole('button', { name: '거래 요청' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '메시지 신고' })).toHaveAttribute('href', '/reports/new?targetType=MESSAGE&targetId=31')
    fireEvent.click(screen.getByRole('button', { name: '거래 요청' }))
    expect(await screen.findByText('거래 상세 화면')).toBeInTheDocument()
    expect(createTrade).toHaveBeenCalledWith({ listingId: 7 })
  })

  it('판매자에게는 구매 요청 버튼이 보이지 않는다', async () => {
    vi.spyOn(chatApi, 'getChatRoomSummary').mockResolvedValue(room)
    vi.spyOn(chatApi, 'getMessages').mockResolvedValue({ items: [], nextCursor: null, hasNext: false })
    vi.spyOn(listingsApi, 'getListing').mockResolvedValue({ ...listing, isMine: true })

    renderRoom()

    expect(await screen.findByText('테스트 상품')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '거래 요청' })).not.toBeInTheDocument()
  })
})
