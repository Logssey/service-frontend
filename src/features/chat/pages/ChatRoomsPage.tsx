import { MessageCircle, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useChatRooms } from '@/features/chat/model/queries'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'

const relativeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function ChatRoomsPage() {
  const roomsQuery = useChatRooms()
  const rooms = roomsQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="app-page collection-page">
      <PageHeader
        title="채팅"
        action={
          <Link className="icon-button" to="/trades" aria-label="거래 내역">
            <ReceiptText size={20} aria-hidden="true" />
          </Link>
        }
      />
      <main className="content-shell chat-list-content">
        <div className="collection-heading chat-list-heading">
          <div>
            <span className="eyebrow">
              <MessageCircle size={15} aria-hidden="true" />
              거래 이야기를 이어가세요
            </span>
            <h1>대화 목록</h1>
          </div>
          {!roomsQuery.isLoading ? <span>{rooms.length}개</span> : null}
        </div>

        {roomsQuery.isLoading ? <LoadingState label="채팅방을 불러오는 중" /> : null}
        {roomsQuery.isError ? (
          <ErrorState
            title="채팅방을 불러오지 못했어요"
            retry={() => void roomsQuery.refetch()}
          />
        ) : null}
        {roomsQuery.isSuccess && rooms.length === 0 ? (
          <EmptyState
            title="아직 대화가 없습니다"
            description="관심 있는 상품의 판매자에게 먼저 말을 걸어 보세요."
            action={
              <Link className="button button--primary" to="/">
                상품 둘러보기
              </Link>
            }
          />
        ) : null}
        {rooms.length > 0 ? (
          <div className="chat-room-list">
            {rooms.map((room) => (
              <Link className="chat-room-card" to={`/chat/${room.chatRoomId}`} key={room.chatRoomId}>
                <span className="avatar" aria-hidden="true">
                  {room.counterparty.nickname.slice(0, 1)}
                </span>
                <span className="chat-room-card__copy">
                  <span className="chat-room-card__topline">
                    <strong>{room.counterparty.nickname}</strong>
                    {room.lastMessageAt ? (
                      <time dateTime={room.lastMessageAt}>
                        {relativeFormatter.format(new Date(room.lastMessageAt))}
                      </time>
                    ) : null}
                  </span>
                  <span className="chat-room-card__product">{room.listing.title}</span>
                  <span className="chat-room-card__message">
                    {room.lastMessage ?? '대화를 시작해 보세요.'}
                  </span>
                </span>
                <span className="chat-room-card__side">
                  <ProductImage
                    listingId={room.listing.listingId}
                    url={room.listing.thumbnailUrl}
                    alt=""
                  />
                  {room.unreadCount > 0 ? (
                    <b aria-label={`읽지 않은 메시지 ${room.unreadCount}개`}>
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </b>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
        {roomsQuery.hasNextPage ? (
          <button
            className="load-more"
            type="button"
            disabled={roomsQuery.isFetchingNextPage}
            onClick={() => void roomsQuery.fetchNextPage()}
          >
            {roomsQuery.isFetchingNextPage ? '불러오는 중…' : '채팅 더 보기'}
          </button>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
