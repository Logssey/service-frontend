import type { UserSummaryResponse } from '@/features/listings/model/types'
import type {
  ListingBriefResponse,
  TradeAction,
  TradeCreateResponse,
  TradeDetailResponse,
  TradePage,
  TradeSearchRequest,
  TradeStatus,
  TradeStatusResponse,
  TradeSummaryResponse,
} from '@/features/trades/model/types'
import { PRODUCT_SHEET_URL } from '@/mocks/listingFixtures'
import { mockListingRepository } from '@/mocks/listingRepository'
import { ApiClientError } from '@/shared/api/http'

const CURRENT_USER: UserSummaryResponse = {
  userId: 3,
  nickname: '재현',
  profileImageUrl: null,
}

const users: Record<number, UserSummaryResponse> = {
  5: { userId: 5, nickname: '판매왕', profileImageUrl: null },
  8: { userId: 8, nickname: '필름한장', profileImageUrl: null },
  12: { userId: 12, nickname: '차분한거래', profileImageUrl: null },
  18: { userId: 18, nickname: '정리중이에요', profileImageUrl: null },
  24: { userId: 24, nickname: '공간수집가', profileImageUrl: null },
  31: { userId: 31, nickname: '조명찾는사람', profileImageUrl: null },
}

const listingBriefs: Record<number, ListingBriefResponse> = {
  101: {
    listingId: 101,
    title: '아이패드 프로 11형 · 키보드 포함',
    price: 650_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
  102: {
    listingId: 102,
    title: '입문용 미러리스 카메라',
    price: 420_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
  103: {
    listingId: 103,
    title: '크림색 노이즈캔슬링 헤드폰',
    price: 118_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
  104: {
    listingId: 104,
    title: '빈티지 그린 데스크 램프',
    price: 48_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
  105: {
    listingId: 105,
    title: '태블릿 키보드 케이스 세트',
    price: 89_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
  108: {
    listingId: 108,
    title: '작업실용 스탠드 조명',
    price: 35_000,
    thumbnailUrl: PRODUCT_SHEET_URL,
  },
}

const initialTrades: TradeDetailResponse[] = [
  {
    tradeId: 55,
    status: 'ACCEPTED',
    listing: listingBriefs[103],
    seller: users[12],
    buyer: CURRENT_USER,
    myRole: 'BUYER',
    chatRoomId: 15,
    reviewWritten: false,
    histories: [
      { status: 'REQUESTED', changedAt: '2026-09-20T23:42:00Z', reason: null },
      { status: 'ACCEPTED', changedAt: '2026-09-21T00:05:00Z', reason: null },
    ],
  },
  {
    tradeId: 56,
    status: 'REQUESTED',
    listing: listingBriefs[102],
    seller: users[8],
    buyer: CURRENT_USER,
    myRole: 'BUYER',
    chatRoomId: 13,
    reviewWritten: false,
    histories: [
      { status: 'REQUESTED', changedAt: '2026-09-21T02:31:00Z', reason: null },
    ],
  },
  {
    tradeId: 57,
    status: 'COMPLETED',
    listing: listingBriefs[105],
    seller: users[18],
    buyer: CURRENT_USER,
    myRole: 'BUYER',
    chatRoomId: 16,
    reviewWritten: false,
    histories: [
      { status: 'REQUESTED', changedAt: '2026-09-19T08:03:00Z', reason: null },
      { status: 'ACCEPTED', changedAt: '2026-09-19T08:40:00Z', reason: null },
      { status: 'COMPLETED', changedAt: '2026-09-20T06:20:00Z', reason: null },
    ],
  },
  {
    tradeId: 58,
    status: 'CANCELED',
    listing: listingBriefs[108],
    seller: users[24],
    buyer: CURRENT_USER,
    myRole: 'BUYER',
    chatRoomId: 17,
    reviewWritten: false,
    histories: [
      { status: 'REQUESTED', changedAt: '2026-09-16T05:10:00Z', reason: null },
      {
        status: 'CANCELED',
        changedAt: '2026-09-16T06:00:00Z',
        reason: '거래 일정을 맞추기 어려워요.',
      },
    ],
  },
  {
    tradeId: 59,
    status: 'REQUESTED',
    listing: listingBriefs[104],
    seller: CURRENT_USER,
    buyer: users[31],
    myRole: 'SELLER',
    chatRoomId: 14,
    reviewWritten: false,
    histories: [
      { status: 'REQUESTED', changedAt: '2026-09-21T05:04:00Z', reason: null },
    ],
  },
]

let trades = structuredClone(initialTrades)
let nextTradeId = 60

const wait = (milliseconds = 150) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cursorToOffset(cursor?: string | null) {
  if (!cursor) return 0
  const offset = Number.parseInt(atob(cursor), 10)
  return Number.isNaN(offset) ? 0 : offset
}

function toSummary(trade: TradeDetailResponse): TradeSummaryResponse {
  return {
    tradeId: trade.tradeId,
    status: trade.status,
    listing: trade.listing,
    counterparty: trade.myRole === 'BUYER' ? trade.seller : trade.buyer,
    myRole: trade.myRole,
    requestedAt:
      trade.histories.find((history) => history.status === 'REQUESTED')?.changedAt ??
      trade.histories[0].changedAt,
    completedAt:
      trade.histories.find((history) => history.status === 'COMPLETED')?.changedAt ??
      null,
    reviewWritten: trade.reviewWritten,
  }
}

function assertActionAllowed(trade: TradeDetailResponse, action: TradeAction) {
  const allowed =
    (action === 'accept' && trade.status === 'REQUESTED' && trade.myRole === 'SELLER') ||
    (action === 'reject' && trade.status === 'REQUESTED' && trade.myRole === 'SELLER') ||
    (action === 'cancel' &&
      ((trade.status === 'REQUESTED' && trade.myRole === 'BUYER') ||
        trade.status === 'ACCEPTED')) ||
    (action === 'complete' && trade.status === 'ACCEPTED' && trade.myRole === 'BUYER')

  if (!allowed) throw new Error('현재 상태에서는 이 거래를 변경할 수 없습니다.')
}

const actionStatus: Record<TradeAction, TradeStatus> = {
  accept: 'ACCEPTED',
  reject: 'REJECTED',
  cancel: 'CANCELED',
  complete: 'COMPLETED',
}

export const mockTradeRepository = {
  async getTrades(request: TradeSearchRequest): Promise<TradePage> {
    await wait()
    const role = request.role === 'buyer' ? 'BUYER' : 'SELLER'
    const offset = cursorToOffset(request.cursor)
    const size = request.size ?? 20
    const filtered = trades
      .filter((trade) => trade.myRole === role)
      .filter((trade) => !request.status || trade.status === request.status)
      .sort(
        (left, right) =>
          Date.parse(toSummary(right).requestedAt) -
          Date.parse(toSummary(left).requestedAt),
      )
    const pageItems = filtered.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toSummary),
      nextCursor: nextOffset < filtered.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < filtered.length,
    }
  },

  async getTrade(tradeId: number): Promise<TradeDetailResponse> {
    await wait(110)
    const trade = trades.find((item) => item.tradeId === tradeId)
    if (!trade) throw new Error('거래를 찾을 수 없습니다.')
    return structuredClone(trade)
  },

  async createTrade(listingId: number): Promise<TradeCreateResponse> {
    const listing = await mockListingRepository.getListing(listingId)
    await wait()
    if (listing.isMine || listing.status !== 'ON_SALE') {
      throw new Error('거래를 요청할 수 없는 상품입니다.')
    }

    const existing = trades.find(
      (trade) =>
        trade.listing.listingId === listingId &&
        trade.myRole === 'BUYER' &&
        (trade.status === 'REQUESTED' || trade.status === 'ACCEPTED'),
    )
    if (existing) {
      return { tradeId: existing.tradeId, status: 'REQUESTED' }
    }

    const tradeId = nextTradeId++
    trades.unshift({
      tradeId,
      status: 'REQUESTED',
      listing: {
        listingId,
        title: listing.title,
        price: listing.price,
        thumbnailUrl: listing.images[0]?.url ?? PRODUCT_SHEET_URL,
      },
      seller: {
        userId: listing.seller.userId,
        nickname: listing.seller.nickname,
        profileImageUrl: listing.seller.profileImageUrl,
      },
      buyer: CURRENT_USER,
      myRole: 'BUYER',
      chatRoomId: null,
      reviewWritten: false,
      histories: [
        { status: 'REQUESTED', changedAt: new Date().toISOString(), reason: null },
      ],
    })
    return { tradeId, status: 'REQUESTED' }
  },

  async changeStatus(
    tradeId: number,
    action: TradeAction,
    reason?: string,
  ): Promise<TradeStatusResponse> {
    await wait()
    const trade = trades.find((item) => item.tradeId === tradeId)
    if (!trade) throw new Error('거래를 찾을 수 없습니다.')
    assertActionAllowed(trade, action)

    const previousStatus = trade.status
    const status = actionStatus[action]
    const changedAt = new Date().toISOString()
    trade.status = status
    trade.histories.push({ status, changedAt, reason: reason?.trim() || null })

    if (action === 'accept') {
      mockListingRepository.setListingStatus(trade.listing.listingId, 'RESERVED')
    } else if (action === 'complete') {
      mockListingRepository.setListingStatus(trade.listing.listingId, 'COMPLETED')
    } else if (action === 'cancel' && previousStatus === 'ACCEPTED') {
      mockListingRepository.setListingStatus(trade.listing.listingId, 'ON_SALE')
    }

    return { tradeId, status, changedAt }
  },

  findActiveTradeByListing(listingId: number) {
    const trade = trades.find(
      (item) =>
        item.listing.listingId === listingId &&
        (item.status === 'REQUESTED' || item.status === 'ACCEPTED'),
    )
    return trade ? structuredClone(trade) : null
  },

  countPendingSellerTrades(listingId: number) {
    return trades.filter(
      (trade) =>
        trade.listing.listingId === listingId &&
        trade.myRole === 'SELLER' &&
        trade.status === 'REQUESTED',
    ).length
  },

  attachChatRoom(tradeId: number, chatRoomId: number) {
    const trade = trades.find((item) => item.tradeId === tradeId)
    if (trade) trade.chatRoomId = chatRoomId
  },

  markReviewWritten(tradeId: number) {
    const trade = trades.find((item) => item.tradeId === tradeId)
    if (!trade) {
      throw new ApiClientError(404, 'NOT_FOUND', '거래를 찾을 수 없습니다.')
    }
    if (trade.status !== 'COMPLETED') {
      throw new ApiClientError(
        409,
        'CONFLICT',
        '완료된 거래만 후기를 작성할 수 있습니다.',
      )
    }
    if (trade.reviewWritten) {
      throw new ApiClientError(409, 'CONFLICT', '이미 후기를 작성했습니다.')
    }
    trade.reviewWritten = true
    return structuredClone(trade)
  },

  reset() {
    trades = structuredClone(initialTrades)
    nextTradeId = 60
  },
}

mockListingRepository.configureActiveTradeLookup(
  (listingId) => mockTradeRepository.findActiveTradeByListing(listingId) !== null,
)
mockListingRepository.configurePendingTradeCountLookup((listingId) =>
  mockTradeRepository.countPendingSellerTrades(listingId),
)
