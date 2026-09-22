import { Star } from 'lucide-react'
import type { ReviewResponse } from '@/features/reviews/model/types'

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function ReceivedReviewCard({ review }: { review: ReviewResponse }) {
  return (
    <article className="received-review-card">
      <div className="received-review-card__reviewer">
        <span className="avatar" aria-hidden="true">
          {review.reviewer.nickname.slice(0, 1)}
        </span>
        <div>
          <strong>{review.reviewer.nickname}</strong>
          <time dateTime={review.createdAt}>
            {dateFormatter.format(new Date(review.createdAt))}
          </time>
        </div>
      </div>
      <span
        className="received-review-card__rating"
        role="img"
        aria-label={`별점 ${review.rating}점`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={18}
            fill={index < review.rating ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        ))}
      </span>
      {review.content ? (
        <p>{review.content}</p>
      ) : (
        <p className="received-review-card__empty">별점만 남긴 후기입니다.</p>
      )}
    </article>
  )
}
