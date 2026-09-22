import { MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CommunityCategoryBadge } from '@/features/community/components/CommunityCategoryBadge'
import {
  useCommunityComments,
  useCommunityPost,
} from '@/features/community/model/queries'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { ApiClientError } from '@/shared/api/http'

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function isNotFound(error: unknown) {
  return error instanceof ApiClientError && error.status === 404
}

export function CommunityPostDetailPage() {
  const postId = Number(useParams().postId)
  const hasValidPostId = Number.isFinite(postId) && postId > 0
  const postQuery = useCommunityPost(postId)
  const commentsQuery = useCommunityComments(postId)
  const comments = commentsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const postNotFound = !hasValidPostId || isNotFound(postQuery.error)

  return (
    <div className="app-page collection-page community-detail-page">
      <PageHeader title="게시글" />
      <main className="content-shell community-detail-content">
        {postQuery.isLoading ? (
          <LoadingState label="게시글을 불러오는 중" />
        ) : null}
        {postNotFound ? (
          <div className="state-panel community-not-found" role="alert">
            <MessageCircle size={34} aria-hidden="true" />
            <strong>게시글을 찾을 수 없어요</strong>
            <p>삭제되었거나 존재하지 않는 게시글입니다.</p>
            <Link className="button button--secondary" to="/community">
              목록으로 돌아가기
            </Link>
          </div>
        ) : null}
        {postQuery.isError && !postNotFound ? (
          <ErrorState
            title="게시글을 불러오지 못했어요"
            retry={() => void postQuery.refetch()}
          />
        ) : null}

        {postQuery.data ? (
          <>
            <article className="community-post-detail">
              <div className="community-post-detail__topline">
                <CommunityCategoryBadge category={postQuery.data.category} />
                {postQuery.data.isMine ? (
                  <span className="community-mine-badge">내 글</span>
                ) : null}
              </div>
              <h1>{postQuery.data.title}</h1>
              <div className="community-post-detail__meta">
                <strong>{postQuery.data.author.nickname}</strong>
                <time dateTime={postQuery.data.createdAt}>
                  {dateFormatter.format(new Date(postQuery.data.createdAt))}
                </time>
                <span>조회 {postQuery.data.viewCount}</span>
              </div>
              <p className="community-post-detail__content">
                {postQuery.data.content}
              </p>
            </article>

            <section className="community-comments" aria-labelledby="comments-heading">
              <div className="community-comments__heading">
                <h2 id="comments-heading">댓글</h2>
                <span>{postQuery.data.commentCount}개</span>
              </div>

              {commentsQuery.isLoading ? (
                <p className="community-comments__status" role="status">
                  댓글을 불러오는 중…
                </p>
              ) : null}
              {commentsQuery.isError ? (
                <div className="community-comments__status" role="alert">
                  <p>댓글을 불러오지 못했어요.</p>
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => void commentsQuery.refetch()}
                  >
                    다시 시도
                  </button>
                </div>
              ) : null}
              {commentsQuery.isSuccess && comments.length === 0 ? (
                <p className="community-comments__status">
                  아직 댓글이 없습니다.
                </p>
              ) : null}
              {comments.length > 0 ? (
                <ol className="community-comment-list">
                  {comments.map((comment) => (
                    <li className="community-comment" key={comment.commentId}>
                      <div>
                        <strong>{comment.author.nickname}</strong>
                        {comment.isMine ? (
                          <span className="community-mine-badge">내 댓글</span>
                        ) : null}
                        <time dateTime={comment.createdAt}>
                          {dateFormatter.format(new Date(comment.createdAt))}
                        </time>
                      </div>
                      <p>{comment.content}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
              {commentsQuery.hasNextPage ? (
                <button
                  className="load-more community-comments__more"
                  type="button"
                  disabled={commentsQuery.isFetchingNextPage}
                  onClick={() => void commentsQuery.fetchNextPage()}
                >
                  {commentsQuery.isFetchingNextPage
                    ? '불러오는 중…'
                    : '댓글 더 보기'}
                </button>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
