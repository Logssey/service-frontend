import { MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useChatRoom,
  useDeleteMessage,
  useMessages,
  useReadMessages,
  useSendMessage,
} from '@/features/chat/model/queries'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import { useTrade } from '@/features/trades/model/queries'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

export function ChatRoomPage() {
  const chatRoomId = Number(useParams().chatRoomId)
  const roomQuery = useChatRoom(chatRoomId)
  const messagesQuery = useMessages(chatRoomId)
  const tradeQuery = useTrade(roomQuery.data?.tradeId ?? Number.NaN)
  const sendMessage = useSendMessage(chatRoomId)
  const deleteMessage = useDeleteMessage(chatRoomId)
  const readMessages = useReadMessages(chatRoomId)
  const showToast = useToastStore((state) => state.show)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastReadRequestRef = useRef<number | null>(null)
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

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView?.({ block: 'end' })
    }
  }, [messages.length])

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
          <button
            className="icon-button"
            type="button"
            aria-label="채팅방 더보기"
            onClick={() => showToast('차단·신고는 개발자 B 기능과 연결됩니다.')}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
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
          ) : null}
        </section>

        <section className="message-list" aria-label={`${room.counterparty.nickname}님과의 메시지`}>
          {messagesQuery.hasNextPage ? (
            <button
              className="message-list__more"
              type="button"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => void messagesQuery.fetchNextPage()}
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
