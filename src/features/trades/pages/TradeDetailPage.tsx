import { Check, Clock3, MessageCircle, Star, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import { tradeStatusLabels } from '@/features/trades/model/labels'
import {
  useChangeTradeStatus,
  useTrade,
} from '@/features/trades/model/queries'
import type { TradeAction, TradeStatus } from '@/features/trades/model/types'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const progressStatuses: TradeStatus[] = ['REQUESTED', 'ACCEPTED', 'COMPLETED']

export function TradeDetailPage() {
  const tradeId = Number(useParams().tradeId)
  const tradeQuery = useTrade(tradeId)
  const changeStatus = useChangeTradeStatus()
  const showToast = useToastStore((state) => state.show)

  if (tradeQuery.isLoading) {
    return (
      <div className="app-page">
        <PageHeader title="거래 상세" />
        <LoadingState label="거래 정보를 불러오는 중" />
      </div>
    )
  }

  if (tradeQuery.isError || !tradeQuery.data) {
    return (
      <div className="app-page">
        <PageHeader title="거래 상세" />
        <ErrorState
          title="거래 정보를 불러오지 못했어요"
          retry={() => void tradeQuery.refetch()}
        />
      </div>
    )
  }

  const trade = tradeQuery.data
  const counterparty = trade.myRole === 'BUYER' ? trade.seller : trade.buyer
  const currentProgress = progressStatuses.indexOf(trade.status)
  const isClosed = trade.status === 'REJECTED' || trade.status === 'CANCELED'

  const runAction = (action: TradeAction, successMessage: string) => {
    changeStatus.mutate(
      { tradeId, action },
      {
        onSuccess: () => showToast(successMessage),
        onError: (error) =>
          showToast(
            error instanceof Error ? error.message : '거래 상태를 변경하지 못했습니다.',
          ),
      },
    )
  }

  const actions = (() => {
    if (trade.status === 'REQUESTED' && trade.myRole === 'SELLER') {
      return (
        <>
          <button
            className="button button--secondary"
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => runAction('reject', '거래 요청을 거절했습니다.')}
          >
            요청 거절
          </button>
          <button
            className="button button--primary"
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => runAction('accept', '거래 요청을 승인했습니다.')}
          >
            거래 승인
          </button>
        </>
      )
    }
    if (trade.status === 'REQUESTED' && trade.myRole === 'BUYER') {
      return (
        <button
          className="button button--secondary"
          type="button"
          disabled={changeStatus.isPending}
          onClick={() => runAction('cancel', '거래 요청을 취소했습니다.')}
        >
          거래 요청 취소
        </button>
      )
    }
    if (trade.status === 'ACCEPTED') {
      return (
        <>
          <button
            className="button button--secondary"
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => runAction('cancel', '거래를 취소했습니다.')}
          >
            거래 취소
          </button>
          {trade.myRole === 'BUYER' ? (
            <button
              className="button button--primary"
              type="button"
              disabled={changeStatus.isPending}
              onClick={() => runAction('complete', '거래를 완료했습니다.')}
            >
              거래 완료
            </button>
          ) : null}
        </>
      )
    }
    if (trade.status === 'COMPLETED' && !trade.reviewWritten) {
      return (
        <button
          className="button button--primary"
          type="button"
          onClick={() => showToast('후기 작성은 다음 단계에서 연결됩니다.')}
        >
          <Star size={18} aria-hidden="true" />
          후기 쓰기
        </button>
      )
    }
    return null
  })()

  return (
    <div className="app-page trade-detail-page">
      <PageHeader title="거래 상세" />
      <main className="content-shell trade-detail-content">
        <section className="trade-progress" aria-label="거래 진행 상태">
          <div className="trade-progress__heading">
            <div>
              <span>거래 #{trade.tradeId}</span>
              <h1>{tradeStatusLabels[trade.status]}</h1>
            </div>
            <TradeStatusBadge status={trade.status} />
          </div>
          <ol className={isClosed ? 'is-closed' : ''}>
            {progressStatuses.map((status, index) => {
              const isDone = currentProgress >= index && !isClosed
              return (
                <li className={isDone ? 'is-done' : ''} key={status}>
                  <span>{isDone ? <Check aria-hidden="true" /> : index + 1}</span>
                  <strong>{tradeStatusLabels[status]}</strong>
                </li>
              )
            })}
          </ol>
          {isClosed ? (
            <p className="trade-closed-note">
              이 거래는 {tradeStatusLabels[trade.status]} 상태로 종료되었습니다.
            </p>
          ) : null}
        </section>

        <div className="trade-detail-grid">
          <div>
            <section className="detail-card">
              <h2>거래 상품</h2>
              <Link className="trade-listing-link" to={`/listings/${trade.listing.listingId}`}>
                <ProductImage
                  listingId={trade.listing.listingId}
                  url={trade.listing.thumbnailUrl}
                  alt={`${trade.listing.title} 상품 사진`}
                />
                <span>
                  <strong>{trade.listing.title}</strong>
                  <b>{numberFormatter.format(trade.listing.price)}원</b>
                </span>
              </Link>
            </section>

            <section className="detail-card counterpart-card">
              <h2>거래 상대</h2>
              <div>
                <span className="avatar" aria-hidden="true">
                  {counterparty.nickname.slice(0, 1)}
                </span>
                <span>
                  <strong>{counterparty.nickname}</strong>
                  <small>
                    나는 {trade.myRole === 'BUYER' ? '구매자' : '판매자'}입니다
                  </small>
                </span>
                <UserRound size={20} aria-hidden="true" />
              </div>
            </section>
          </div>

          <section className="detail-card trade-history">
            <h2>진행 기록</h2>
            <ol>
              {[...trade.histories].reverse().map((history) => (
                <li key={`${history.status}-${history.changedAt}`}>
                  <span className="history-icon">
                    <Clock3 size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{tradeStatusLabels[history.status]}</strong>
                    <time dateTime={history.changedAt}>
                      {dateTimeFormatter.format(new Date(history.changedAt))}
                    </time>
                    {history.reason ? <p>{history.reason}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="trade-detail-actions">
          {actions ? <div className="trade-state-actions">{actions}</div> : null}
          {trade.chatRoomId ? (
            <Link className="button button--secondary" to={`/chat/${trade.chatRoomId}`}>
              <MessageCircle size={18} aria-hidden="true" />
              채팅방으로 이동
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  )
}
