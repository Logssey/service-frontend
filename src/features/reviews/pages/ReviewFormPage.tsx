import { useState, type FormEvent } from 'react'
import { AlertCircle, LoaderCircle, Star } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { useCreateReview } from '@/features/reviews/model/queries'
import type { ReviewRating } from '@/features/reviews/model/types'
import { useTrade } from '@/features/trades/model/queries'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const ratingOptions: Array<{ value: ReviewRating; label: string }> = [
  { value: 1, label: '별로예요' },
  { value: 2, label: '아쉬워요' },
  { value: 3, label: '보통이에요' },
  { value: 4, label: '좋아요' },
  { value: 5, label: '최고예요' },
]

export function ReviewFormPage() {
  const tradeId = Number(useParams().tradeId)
  const navigate = useNavigate()
  const tradeQuery = useTrade(tradeId)
  const createReview = useCreateReview()
  const showToast = useToastStore((state) => state.show)
  const [rating, setRating] = useState<ReviewRating | null>(null)
  const [content, setContent] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (tradeQuery.isLoading) {
    return (
      <div className="app-page review-page">
        <PageHeader title="거래 후기" />
        <LoadingState label="거래 정보를 불러오는 중" />
      </div>
    )
  }

  if (tradeQuery.isError || !tradeQuery.data) {
    return (
      <div className="app-page review-page">
        <PageHeader title="거래 후기" />
        <ErrorState
          title="거래 정보를 불러오지 못했어요"
          retry={() => void tradeQuery.refetch()}
        />
      </div>
    )
  }

  const trade = tradeQuery.data
  const counterparty = trade.myRole === 'BUYER' ? trade.seller : trade.buyer
  const unavailableMessage = trade.reviewWritten
    ? '이미 후기를 작성한 거래입니다.'
    : trade.status !== 'COMPLETED'
      ? '거래가 완료된 뒤 후기를 작성할 수 있습니다.'
      : null

  if (unavailableMessage) {
    return (
      <div className="app-page review-page">
        <PageHeader title="거래 후기" />
        <main className="form-shell review-shell">
          <div className="state-panel review-unavailable">
            <AlertCircle size={34} aria-hidden="true" />
            <strong>후기를 작성할 수 없어요</strong>
            <p>{unavailableMessage}</p>
            <Link className="button button--secondary" to={`/trades/${tradeId}`}>
              거래 상세로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (rating === null || createReview.isPending) return

    setSubmitError(null)
    const trimmedContent = content.trim()
    try {
      await createReview.mutateAsync({
        tradeId,
        rating,
        ...(trimmedContent ? { content: trimmedContent } : {}),
      })
      showToast('후기가 등록되었습니다.')
      navigate(`/trades/${tradeId}`, { replace: true })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : '후기를 등록하지 못했습니다.',
      )
    }
  }

  const selectedRating = ratingOptions.find((option) => option.value === rating)

  return (
    <div className="app-page review-page">
      <PageHeader title="거래 후기" />
      <main className="form-shell review-shell">
        <form className="review-form" onSubmit={submit}>
          <section className="form-section review-target" aria-label="후기 대상 거래">
            <Link
              className="trade-listing-link"
              to={`/listings/${trade.listing.listingId}`}
            >
              <ProductImage
                listingId={trade.listing.listingId}
                url={trade.listing.thumbnailUrl}
                alt={`${trade.listing.title} 상품 사진`}
              />
              <span>
                <strong>{trade.listing.title}</strong>
                <small>{counterparty.nickname} 님과의 거래</small>
              </span>
            </Link>
          </section>

          <section className="form-section rating-picker" aria-labelledby="rating-title">
            <h2 id="rating-title">거래는 어떠셨나요?</h2>
            <div className="rating-options" aria-label="거래 별점">
              {ratingOptions.map((option) => (
                <button
                  className={
                    rating !== null && option.value <= rating
                      ? 'rating-option is-active'
                      : 'rating-option'
                  }
                  type="button"
                  aria-label={`${option.value}점`}
                  aria-pressed={rating === option.value}
                  key={option.value}
                  onClick={() => {
                    setRating(option.value)
                    setSubmitError(null)
                  }}
                >
                  <Star aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="rating-caption" aria-live="polite">
              {selectedRating
                ? `${selectedRating.value}점 · ${selectedRating.label}`
                : '별점을 선택해 주세요'}
            </p>
          </section>

          <section className="form-section">
            <label className="field">
              <span className="field__label">거래 경험</span>
              <textarea
                aria-label="거래 경험"
                maxLength={500}
                rows={5}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value.slice(0, 500))
                  setSubmitError(null)
                }}
                placeholder="거래 경험을 남겨주세요 (선택)"
              />
              <span className="field__count">{content.length} / 500</span>
            </label>
          </section>

          {submitError ? (
            <p className="form-submit-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="listing-form-submit review-form-submit">
            <button
              className="button button--primary"
              type="submit"
              disabled={rating === null || createReview.isPending}
            >
              {createReview.isPending ? (
                <>
                  <LoaderCircle className="spin" size={19} aria-hidden="true" />
                  등록하는 중
                </>
              ) : (
                '후기 등록'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
