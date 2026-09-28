import { useMutation } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isUnauthenticated, useOngoingTrades } from '@/features/account/model/queries'
import { useEndSession } from '@/features/account/model/useEndSession'
import { authApi } from '@/features/auth/api/authApi'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { tradeStatusLabels } from '@/features/trades/model/labels'
import type { TradeRole } from '@/features/trades/model/types'
import { LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ApiClientError } from '@/shared/api/http'

/** 서버가 탈퇴 트랜잭션에서 하는 일(회원 탈퇴 명세 "서버 처리")을 사용자 말로 옮겼다. */
const WITHDRAWAL_EFFECTS = [
  '진행 중인 거래가 모두 취소됩니다',
  '거래 상대방에게 취소 알림이 발송됩니다',
  "닉네임이 '탈퇴회원#번호'로 바뀝니다",
  '프로필 사진과 소개가 삭제됩니다',
  '작성한 글 · 후기 · 메시지는 유지됩니다',
  '탈퇴한 계정은 복구할 수 없습니다',
  '다시 가입하면 새 계정으로 시작됩니다',
]

const roleLabels: Record<TradeRole, string> = { BUYER: '구매', SELLER: '판매' }

interface Failure {
  message: string
  /** 다시 눌러도 결과가 같은 실패(관리자 계정)면 버튼을 막아 둔다 */
  blocked: boolean
}

/**
 * MY-003 회원 탈퇴(my-account.md).
 *
 * 체크박스가 확인 역할을 하므로 탈퇴하기를 누르면 추가 확인 없이 바로 요청한다.
 * 거래 미리 보기가 실패해도 탈퇴는 막지 않는다 — 취소 대상은 서버가 탈퇴 시점에 다시 찾는다.
 */
export function WithdrawalPage() {
  const navigate = useNavigate()
  const endSession = useEndSession()
  const tradesQuery = useOngoingTrades()
  const withdraw = useMutation({ mutationFn: () => authApi.withdraw() })
  const [confirmed, setConfirmed] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const pending = withdraw.isPending
  const sessionExpired = isUnauthenticated(tradesQuery.error)

  useEffect(() => {
    if (sessionExpired) {
      navigate('/login', { replace: true, state: { message: '로그인이 필요합니다.' } })
    }
  }, [navigate, sessionExpired])

  const submit = () => {
    setFailure(null)
    withdraw.mutate(undefined, {
      onSuccess: () => endSession({ message: '회원 탈퇴가 완료되었습니다.', tone: 'info' }),
      onError: (error) => {
        if (isUnauthenticated(error)) {
          endSession({ message: '다시 로그인해 주세요.' })
          return
        }
        if (error instanceof ApiClientError && error.status === 403) {
          setFailure({ message: '관리자 계정은 탈퇴할 수 없습니다.', blocked: true })
          return
        }
        setFailure({ message: '탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.', blocked: false })
      },
    })
  }

  const trades = tradesQuery.data?.items ?? []
  const tradeHeading = tradesQuery.data
    ? `진행 중인 거래 ${trades.length}건${tradesQuery.data.hasMore ? ' 이상' : ''}`
    : '진행 중인 거래'

  return (
    <div className="app-page withdrawal-page">
      <PageHeader title="회원 탈퇴" />
      <main className="content-shell withdrawal-content">
        <h1>정말 탈퇴하시겠어요?</h1>

        <section className="withdrawal-notice" aria-labelledby="withdrawal-notice-title">
          <h2 id="withdrawal-notice-title">
            <TriangleAlert size={17} aria-hidden="true" />
            탈퇴 시 처리되는 내용
          </h2>
          <ul>
            {WITHDRAWAL_EFFECTS.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        </section>

        <section className="withdrawal-trades" aria-labelledby="withdrawal-trades-title">
          <h2 id="withdrawal-trades-title">{tradeHeading}</h2>
          {tradesQuery.isPending ? <LoadingState label="진행 중인 거래를 확인하는 중" /> : null}
          {tradesQuery.isError && !sessionExpired ? (
            <div className="withdrawal-trades__message" role="alert">
              <p>거래 정보를 불러오지 못했어요.</p>
              <button
                className="text-action"
                type="button"
                onClick={() => void tradesQuery.refetch()}
              >
                다시 시도
              </button>
            </div>
          ) : null}
          {tradesQuery.isSuccess && trades.length === 0 ? (
            <p className="withdrawal-trades__message">취소될 거래가 없습니다</p>
          ) : null}
          {trades.length > 0 ? (
            <ul className="withdrawal-trade-list">
              {trades.map((trade) => (
                <li key={trade.tradeId}>
                  <Link className="withdrawal-trade" to={`/trades/${trade.tradeId}`}>
                    <ProductImage
                      listingId={trade.listing.listingId}
                      url={trade.listing.thumbnailUrl}
                      alt={`${trade.listing.title} 상품 사진`}
                    />
                    <span className="withdrawal-trade__copy">
                      <strong>{trade.listing.title}</strong>
                      <span>
                        {tradeStatusLabels[trade.status]} · {roleLabels[trade.myRole]} ·{' '}
                        {trade.counterparty.nickname}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <label className="checkbox-row withdrawal-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={pending}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          안내 내용을 모두 확인했습니다
        </label>

        {failure ? (
          <p className="auth-alert" role="alert">
            {failure.message}
          </p>
        ) : null}

        <div className="withdrawal-actions">
          <button
            className="button button--danger"
            type="button"
            disabled={!confirmed || pending || failure?.blocked === true}
            onClick={submit}
          >
            {pending ? '탈퇴 처리 중…' : '탈퇴하기'}
          </button>
          <button
            className="button button--secondary"
            type="button"
            disabled={pending}
            onClick={() => navigate('/me')}
          >
            취소
          </button>
        </div>
      </main>
    </div>
  )
}
