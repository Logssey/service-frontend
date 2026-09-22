import type {
  ChatRoomCreateResponse,
  ChatRoomPage,
  ChatRoomSummaryResponse,
  MessagePage,
  MessageReadResponse,
  MessageResponse,
} from '@/features/chat/model/types'
import type { UserSummaryResponse } from '@/features/listings/model/types'
import type { ListingBriefResponse } from '@/features/trades/model/types'
import { PRODUCT_SHEET_URL } from '@/mocks/listingFixtures'
import { mockListingRepository } from '@/mocks/listingRepository'
import { mockTradeRepository } from '@/mocks/tradeRepository'

const CURRENT_USER_ID = 3

const users: Record<number, UserSummaryResponse> = {
  5: { userId: 5, nickname: '판매왕', profileImageUrl: null },
  8: { userId: 8, nickname: '필름한장', profileImageUrl: null },
  12: { userId: 12, nickname: '차분한거래', profileImageUrl: null },
  18: { userId: 18, nickname: '정리중이에요', profileImageUrl: null },
  24: { userId: 24, nickname: '공간수집가', profileImageUrl: null },
  31: { userId: 31, nickname: '조명찾는사람', profileImageUrl: null },
}

function listing(
  listingId: number,
  title: string,
  price: number,
): ListingBriefResponse {
  return { listingId, title, price, thumbnailUrl: PRODUCT_SHEET_URL }
}

const initialRooms: ChatRoomSummaryResponse[] = [
  {
    chatRoomId: 12,
    listing: listing(101, '아이패드 프로 11형 · 키보드 포함', 650_000),
    counterparty: users[5],
    lastMessage: '좋아요. 오늘 저녁 7시에 뵐게요!',
    lastMessageAt: '2026-09-21T06:18:00Z',
    unreadCount: 2,
    tradeId: null,
  },
  {
    chatRoomId: 14,
    listing: listing(104, '빈티지 그린 데스크 램프', 48_000),
    counterparty: users[31],
    lastMessage: '직접 확인하고 구매하고 싶어요.',
    lastMessageAt: '2026-09-21T05:06:00Z',
    unreadCount: 1,
    tradeId: 59,
  },
  {
    chatRoomId: 13,
    listing: listing(102, '입문용 미러리스 카메라', 420_000),
    counterparty: users[8],
    lastMessage: '렌즈도 함께 포함된 가격입니다.',
    lastMessageAt: '2026-09-21T02:28:00Z',
    unreadCount: 0,
    tradeId: 56,
  },
  {
    chatRoomId: 15,
    listing: listing(103, '크림색 노이즈캔슬링 헤드폰', 118_000),
    counterparty: users[12],
    lastMessage: '배송 주소 확인했습니다.',
    lastMessageAt: '2026-09-21T00:12:00Z',
    unreadCount: 0,
    tradeId: 55,
  },
  {
    chatRoomId: 16,
    listing: listing(105, '태블릿 키보드 케이스 세트', 89_000),
    counterparty: users[18],
    lastMessage: '거래 감사합니다!',
    lastMessageAt: '2026-09-20T06:22:00Z',
    unreadCount: 0,
    tradeId: 57,
  },
  {
    chatRoomId: 17,
    listing: listing(108, '작업실용 스탠드 조명', 35_000),
    counterparty: users[24],
    lastMessage: '다음 기회에 거래할게요.',
    lastMessageAt: '2026-09-16T06:02:00Z',
    unreadCount: 0,
    tradeId: 58,
  },
]

const initialMessages: Record<number, MessageResponse[]> = {
  12: [
    {
      messageId: 981,
      senderId: CURRENT_USER_ID,
      content: '안녕하세요, 오늘 직거래 가능할까요?',
      isMine: true,
      isDeleted: false,
      readAt: '2026-09-21T06:04:00Z',
      createdAt: '2026-09-21T06:01:00Z',
    },
    {
      messageId: 982,
      senderId: 5,
      content: '네, 가능합니다. 오후 7시는 어떠세요?',
      isMine: false,
      isDeleted: false,
      readAt: null,
      createdAt: '2026-09-21T06:09:00Z',
    },
    {
      messageId: 983,
      senderId: CURRENT_USER_ID,
      content: '좋습니다. 역 2번 출구 앞에서 만나요.',
      isMine: true,
      isDeleted: false,
      readAt: null,
      createdAt: '2026-09-21T06:14:00Z',
    },
    {
      messageId: 984,
      senderId: 5,
      content: '좋아요. 오늘 저녁 7시에 뵐게요!',
      isMine: false,
      isDeleted: false,
      readAt: null,
      createdAt: '2026-09-21T06:18:00Z',
    },
  ],
  13: [
    {
      messageId: 970,
      senderId: CURRENT_USER_ID,
      content: '렌즈 포함 가격인가요?',
      isMine: true,
      isDeleted: false,
      readAt: '2026-09-21T02:27:00Z',
      createdAt: '2026-09-21T02:26:00Z',
    },
    {
      messageId: 971,
      senderId: 8,
      content: '렌즈도 함께 포함된 가격입니다.',
      isMine: false,
      isDeleted: false,
      readAt: '2026-09-21T02:31:00Z',
      createdAt: '2026-09-21T02:28:00Z',
    },
  ],
  14: [
    {
      messageId: 975,
      senderId: 31,
      content: '직접 확인하고 구매하고 싶어요.',
      isMine: false,
      isDeleted: false,
      readAt: null,
      createdAt: '2026-09-21T05:06:00Z',
    },
  ],
  15: [
    {
      messageId: 965,
      senderId: 12,
      content: '배송 주소 확인했습니다.',
      isMine: false,
      isDeleted: false,
      readAt: '2026-09-21T00:13:00Z',
      createdAt: '2026-09-21T00:12:00Z',
    },
  ],
  16: [
    {
      messageId: 950,
      senderId: 18,
      content: '거래 감사합니다!',
      isMine: false,
      isDeleted: false,
      readAt: '2026-09-20T06:23:00Z',
      createdAt: '2026-09-20T06:22:00Z',
    },
  ],
  17: [
    {
      messageId: 940,
      senderId: 24,
      content: '다음 기회에 거래할게요.',
      isMine: false,
      isDeleted: false,
      readAt: '2026-09-16T06:03:00Z',
      createdAt: '2026-09-16T06:02:00Z',
    },
  ],
}

let rooms = structuredClone(initialRooms)
let messages = structuredClone(initialMessages)
let nextRoomId = 18
let nextMessageId = 1_000

const wait = (milliseconds = 130) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cursorToOffset(cursor?: string | null) {
  if (!cursor) return 0
  const offset = Number.parseInt(atob(cursor), 10)
  return Number.isNaN(offset) ? 0 : offset
}

function sortRooms(items: ChatRoomSummaryResponse[]) {
  return [...items].sort((left, right) => {
    if (!left.lastMessageAt) return 1
    if (!right.lastMessageAt) return -1
    return Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt)
  })
}

export const mockChatRepository = {
  async getChatRooms(cursor?: string | null, size = 20): Promise<ChatRoomPage> {
    await wait()
    const offset = cursorToOffset(cursor)
    const sorted = sortRooms(rooms)
    const pageItems = sorted.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length
    return {
      items: structuredClone(pageItems),
      nextCursor: nextOffset < sorted.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < sorted.length,
    }
  },

  async getChatRoom(chatRoomId: number): Promise<ChatRoomSummaryResponse> {
    await wait(90)
    const room = rooms.find((item) => item.chatRoomId === chatRoomId)
    if (!room) throw new Error('채팅방을 찾을 수 없습니다.')
    return structuredClone(room)
  },

  async createChatRoom(listingId: number): Promise<ChatRoomCreateResponse> {
    const product = await mockListingRepository.getListing(listingId)
    await wait()
    if (product.isMine) throw new Error('내 상품에는 채팅을 시작할 수 없습니다.')

    const existing = rooms.find(
      (room) =>
        room.listing.listingId === listingId &&
        room.counterparty.userId === product.seller.userId,
    )
    if (existing) return { chatRoomId: existing.chatRoomId, created: false }

    const activeTrade = mockTradeRepository.findActiveTradeByListing(listingId)
    const chatRoomId = nextRoomId++
    rooms.push({
      chatRoomId,
      listing: {
        listingId,
        title: product.title,
        price: product.price,
        thumbnailUrl: product.images[0]?.url ?? PRODUCT_SHEET_URL,
      },
      counterparty: {
        userId: product.seller.userId,
        nickname: product.seller.nickname,
        profileImageUrl: product.seller.profileImageUrl,
      },
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
      tradeId: activeTrade?.tradeId ?? null,
    })
    messages[chatRoomId] = []
    if (activeTrade) mockTradeRepository.attachChatRoom(activeTrade.tradeId, chatRoomId)
    return { chatRoomId, created: true }
  },

  async getMessages(
    chatRoomId: number,
    cursor?: string | null,
    size = 30,
  ): Promise<MessagePage> {
    await wait()
    if (!rooms.some((room) => room.chatRoomId === chatRoomId)) {
      throw new Error('채팅방을 찾을 수 없습니다.')
    }
    const offset = cursorToOffset(cursor)
    const sorted = [...(messages[chatRoomId] ?? [])].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    const pageItems = sorted.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length
    return {
      items: structuredClone(pageItems),
      nextCursor: nextOffset < sorted.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < sorted.length,
    }
  },

  async sendMessage(chatRoomId: number, content: string): Promise<MessageResponse> {
    await wait(100)
    const room = rooms.find((item) => item.chatRoomId === chatRoomId)
    if (!room) throw new Error('채팅방을 찾을 수 없습니다.')
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 1_000) {
      throw new Error('메시지는 1자 이상 1,000자 이하로 입력해 주세요.')
    }

    const createdAt = new Date().toISOString()
    const message: MessageResponse = {
      messageId: nextMessageId++,
      senderId: CURRENT_USER_ID,
      content: trimmed,
      isMine: true,
      isDeleted: false,
      readAt: null,
      createdAt,
    }
    messages[chatRoomId] = [...(messages[chatRoomId] ?? []), message]
    room.lastMessage = trimmed
    room.lastMessageAt = createdAt
    return structuredClone(message)
  },

  async deleteMessage(chatRoomId: number, messageId: number): Promise<void> {
    await wait(90)
    const roomMessages = messages[chatRoomId]
    const message = roomMessages?.find((item) => item.messageId === messageId)
    if (!message) throw new Error('메시지를 찾을 수 없습니다.')
    if (!message.isMine) throw new Error('내 메시지만 삭제할 수 있습니다.')
    message.content = null
    message.isDeleted = true

    const room = rooms.find((item) => item.chatRoomId === chatRoomId)
    const newest = [...roomMessages].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0]
    if (room && newest?.messageId === messageId) {
      room.lastMessage = '삭제된 메시지입니다.'
    }
  },

  async readMessages(
    chatRoomId: number,
    lastReadMessageId: number,
  ): Promise<MessageReadResponse> {
    await wait(70)
    const room = rooms.find((item) => item.chatRoomId === chatRoomId)
    if (!room) throw new Error('채팅방을 찾을 수 없습니다.')
    const readAt = new Date().toISOString()
    for (const message of messages[chatRoomId] ?? []) {
      if (!message.isMine && message.messageId <= lastReadMessageId) {
        message.readAt = readAt
      }
    }
    room.unreadCount = 0
    return { chatRoomId, unreadCount: 0 }
  },

  reset() {
    rooms = structuredClone(initialRooms)
    messages = structuredClone(initialMessages)
    nextRoomId = 18
    nextMessageId = 1_000
  },
}
