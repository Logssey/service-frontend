import { MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { blocksApi } from '@/features/blocks/api/blocksApi'
import {
  chatKeys,
  useChatRoom,
  useDeleteMessage,
  useMessages,
  useReadMessages,
  useSendMessage,
} from '@/features/chat/model/queries'
import { useChatRealtime } from '@/features/chat/model/useChatRealtime'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { useListing } from '@/features/listings/model/queries'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import { useCreateTrade, useTrade } from '@/features/trades/model/queries'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'
import './chatEnhancements.css'

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

export function ChatRoomPage() {
  const chatRoomId = Number(useParams().chatRoomId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roomQuery = useChatRoom(chatRoomId)
  const messagesQuery = useMessages(chatRoomId)
  const tradeQuery = useTrade(roomQuery.data?.tradeId ?? Number.NaN)
  const listingQuery = useListing(roomQuery.data?.listing.listingId ?? Number.NaN)
  const createTrade = useCreateTrade()
  const sendMessage = useSendMessage(chatRoomId)
  const deleteMessage = useDeleteMessage(chatRoomId)
  const readMessages = useReadMessages(chatRoomId)
  const showToast = useToastStore((state) => state.show)
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const olderScrollRef = useRef<{ height: number; top: number } | null>(null)
  const initialScrollDoneRef = useRef(false)
  const latestMessageIdRef = useRef<number | null>(null)
  const lastReadRequestRef = useRef<number | null>(null)
  useChatRealtime([chatRoomId])
  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages.flatMap((page) => page.items) ?? []).sort(
        (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
      ),
    [messagesQuery.data],
  )

  useEffect(() => {
    const latestIncoming = [...messages].reverse().find((message) => !message.isMine)
    if (
      roomQuery.data &&
      roomQuery.data.unreadCount > 0 &&
      latestIncoming &&
      lastReadRequestRef.current !== latestIncoming.messageId &&
      !readMessages.isPending
    ) {
      lastReadRequestRef.current = latestIncoming.messageId
      readMessages.mutate(latestIncoming.messageId, {
        onError: () => {
          lastReadRequestRef.current = null
        },
      })
    }
  }, [messages, readMessages, roomQuery.data])

  useLayoutEffect(() => {
    if (messagesQuery.isLoading) return
    const snapshot = olderScrollRef.current
    const newest = messages.at(-1)
    if (snapshot) {
      window.scrollTo(0, snapshot.top + document.documentElement.scrollHeight - snapshot.height)
      olderScrollRef.current = null
    } else if (!initialScrollDoneRef.current ||
      (newest?.messageId !== latestMessageIdRef.current &&
        (newest?.isMine || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 240))) {
      bottomRef.current?.scrollIntoView?.({ block: 'end' })
    }
    initialScrollDoneRef.current = true
    latestMessageIdRef.current = newest?.messageId ?? null
  }, [messages, messagesQuery.isLoading])

  const loadOlderMessages = async () => {
    olderScrollRef.current = { height: document.documentElement.scrollHeight, top: window.scrollY }
    const result = await messagesQuery.fetchNextPage()
    if (result.isError) olderScrollRef.current = null
  }

  const blockCounterparty = async (userId: number) => {
    if (blocking || !window.confirm('이 사용자를 차단하시겠습니까? 차단하면 거래와 메시지 교환이 제한됩니다.')) return
    setBlocking(true)
    try {
      await blocksApi.create(userId)
      await queryClient.invalidateQueries({ queryKey: ['blocks'] })
      await queryClient.invalidateQueries({ queryKey: chatKeys.all })
      showToast('사용자를 차단했습니다.')
      navigate('/chat', { replace: true })
    } catch (error) {
      showToast(error instanceof Error ? error.message : '사용자를 차단하지 못했습니다.')
      setBlocking(false)
    }
  }

  if (roomQuery.isLoading || messagesQuery.isLoading) {
    return (
      <div className="app-page">
        <PageHeader title="채팅" />
        <LoadingState label="대화를 불러오는 중" />
      </div>
    )
  }

  if (roomQuery.isError || messagesQuery.isError || !roomQuery.data) {
    return (
      <div className="app-page">
        <PageHeader title="채팅" />
        <ErrorState
          title="대화를 불러오지 못했어요"
          retry={() => {
            void roomQuery.refetch()
            void messagesQuery.refetch()
          }}
        />
      </div>
    )
  }

  const room = roomQuery.data

  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    sendMessage.mutate(content, {
      onSuccess: () => setDraft(''),
      onError: (error) =>
        showToast(
          error instanceof Error ? error.message : '메시지를 보내지 못했습니다.',
        ),
    })
  }

  return (
    <div className="app-page chat-page">
      <PageHeader
        title={room.counterparty.nickname}
        action={
          <div className="chat-room-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="채팅방 더보기"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="chat-room-actions__menu">
                <Link to={`/reports/new?targetType=USER&targetId=${room.counterparty.userId}`}>사용자 신고</Link>
                <button type="button" disabled={blocking} onClick={() => void blockCounterparty(room.counterparty.userId)}>사용자 차단</button>
              </div>
            ) : null}
          </div>
        }
      />
      <main className="chat-content">
        <section className="chat-context" aria-label="거래 상품 정보">
          <Link to={`/listings/${room.listing.listingId}`}>
            <ProductImage
              listingId={room.listing.listingId}
              url={room.listing.thumbnailUrl}
              alt={`${room.listing.title} 상품 사진`}
            />
            <span>
              <small>대화 중인 상품</small>
              <strong>{room.listing.title}</strong>
              <b>{new Intl.NumberFormat('ko-KR').format(room.listing.price)}원</b>
            </span>
          </Link>
          {room.tradeId ? (
            <Link className="chat-context__trade" to={`/trades/${room.tradeId}`}>
              {tradeQuery.data ? <TradeStatusBadge status={tradeQuery.data.status} /> : null}
              <span>거래 상세</span>
            </Link>
          ) : listingQuery.data && !listingQuery.data.isMine ? (
            <button
              className="chat-context__trade chat-context__request"
              type="button"
              disabled={createTrade.isPending}
              onClick={() => createTrade.mutate(room.listing.listingId, {
                onSuccess: ({ tradeId }) => {
                  void queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId) })
                  void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
                  showToast('거래를 요청했습니다.')
                  navigate(`/trades/${tradeId}`)
                },
                onError: (error) => showToast(error instanceof Error ? error.message : '거래를 요청하지 못했습니다.'),
              })}
            >
              {createTrade.isPending ? '요청 중…' : '거래 요청'}
            </button>
          ) : null}
        </section>

        <section className="message-list" aria-label={`${room.counterparty.nickname}님과의 메시지`}>
          {messagesQuery.hasNextPage ? (
            <button
              className="message-list__more"
              type="button"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => void loadOlderMessages()}
            >
              {messagesQuery.isFetchingNextPage ? '불러오는 중…' : '이전 메시지 보기'}
            </button>
          ) : null}
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span className="avatar" aria-hidden="true">
                {room.counterparty.nickname.slice(0, 1)}
              </span>
              <strong>{room.counterparty.nickname}님과 대화를 시작해 보세요</strong>
              <p>개인정보나 외부 결제 링크는 주의해서 공유해 주세요.</p>
            </div>
          ) : null}
          {messages.map((message) => (
            <article
              className={message.isMine ? 'message is-mine' : 'message'}
              key={message.messageId}
            >
              <div className={message.isDeleted ? 'message__bubble is-deleted' : 'message__bubble'}>
                {message.isDeleted ? '삭제된 메시지입니다.' : message.content}
              </div>
              <div className="message__meta">
                {message.isMine && message.readAt ? <span>읽음</span> : null}
                <time dateTime={message.createdAt}>
                  {timeFormatter.format(new Date(message.createdAt))}
                </time>
                {message.isMine && !message.isDeleted ? (
                  <button
                    type="button"
                    aria-label="메시지 삭제"
                    disabled={deleteMessage.isPending}
                    onClick={() =>
                      deleteMessage.mutate(message.messageId, {
                        onError: () => showToast('메시지를 삭제하지 못했습니다.'),
                      })
                    }
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                ) : null}
                {!message.isMine && !message.isDeleted ? (
                  <Link to={`/reports/new?targetType=MESSAGE&targetId=${message.messageId}`} aria-label="메시지 신고">신고</Link>
                ) : null}
              </div>
            </article>
          ))}
          <div ref={bottomRef} />
        </section>
      </main>

      <form className="message-composer" onSubmit={submitMessage}>
        <label>
          <span className="sr-only">메시지</span>
          <textarea
            rows={1}
            maxLength={1_000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="메시지를 입력하세요"
          />
        </label>
        <button
          type="submit"
          aria-label="메시지 보내기"
          disabled={!draft.trim() || sendMessage.isPending}
        >
          <Send size={19} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
