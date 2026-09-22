import { useState } from 'react'
import { MessageCircle, Pencil, Send, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CommunityCategoryBadge } from '@/features/community/components/CommunityCategoryBadge'
import {
  useCommunityComments,
  useCommunityPost,
  useCreateCommunityComment,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
} from '@/features/community/model/queries'
import {
  communityLimits,
  validateCommunityComment,
} from '@/features/community/model/validation'
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
  const navigate = useNavigate()
  const postQuery = useCommunityPost(postId)
  const commentsQuery = useCommunityComments(postId)
  const createComment = useCreateCommunityComment(postId)
  const deleteComment = useDeleteCommunityComment(postId)
  const deletePost = useDeleteCommunityPost()
  const [commentDraft, setCommentDraft] = useState('')
  const [commentValidationError, setCommentValidationError] = useState<
    string | null
  >(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const comments = commentsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const postNotFound = !hasValidPostId || isNotFound(postQuery.error)

  const submitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateCommunityComment(commentDraft)
    setCommentValidationError(validationError)
    if (validationError) return

    createComment.mutate(
      { content: commentDraft.trim() },
      {
        onSuccess: () => {
          setCommentDraft('')
          setCommentValidationError(null)
        },
      },
    )
  }

  const confirmPostDelete = () => {
    deletePost.mutate(postId, {
      onSuccess: () => navigate('/community', { replace: true }),
    })
  }

  return (
    <div className="app-page collection-page community-detail-page">
      <PageHeader
        title="게시글"
        action={
          postQuery.data?.isMine ? (
            <Link
              className="icon-button"
              to={`/community/${postId}/edit`}
              aria-label="게시글 수정"
            >
              <Pencil size={20} aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />
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
              {postQuery.data.isMine ? (
                <div className="community-post-detail__actions">
                  <Link
                    className="button button--secondary"
                    to={`/community/${postId}/edit`}
                  >
                    <Pencil size={17} aria-hidden="true" />
                    수정
                  </Link>
                  <button
                    className="button community-danger-button"
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    삭제
                  </button>
                </div>
              ) : null}
            </article>

            {isConfirmingDelete ? (
              <section
                className="community-delete-confirmation"
                aria-labelledby="community-delete-title"
                aria-live="polite"
              >
                <strong id="community-delete-title">게시글을 삭제할까요?</strong>
                <p>게시글과 댓글이 함께 삭제되며 되돌릴 수 없습니다.</p>
                {deletePost.isError ? (
                  <p className="form-submit-error" role="alert">
                    {deletePost.error instanceof Error
                      ? deletePost.error.message
                      : '게시글을 삭제하지 못했습니다.'}
                  </p>
                ) : null}
                <div>
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={deletePost.isPending}
                    onClick={() => {
                      setIsConfirmingDelete(false)
                      deletePost.reset()
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="button community-danger-button"
                    type="button"
                    disabled={deletePost.isPending}
                    onClick={confirmPostDelete}
                  >
                    {deletePost.isPending ? '삭제하는 중…' : '삭제하기'}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="community-comments" aria-labelledby="comments-heading">
              <div className="community-comments__heading">
                <h2 id="comments-heading">댓글</h2>
                <span>{postQuery.data.commentCount}개</span>
              </div>

              <form className="community-comment-form" onSubmit={submitComment}>
                <label>
                  <span className="sr-only">댓글</span>
                  <textarea
                    aria-label="댓글"
                    rows={3}
                    required
                    maxLength={communityLimits.comment.max}
                    value={commentDraft}
                    aria-invalid={Boolean(commentValidationError)}
                    aria-describedby={
                      commentValidationError ? 'community-comment-error' : undefined
                    }
                    placeholder="거래 경험과 도움이 되는 의견을 남겨 주세요."
                    onChange={(event) => {
                      setCommentDraft(event.target.value)
                      setCommentValidationError(null)
                      createComment.reset()
                    }}
                  />
                  <span>{commentDraft.length}/500</span>
                </label>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={!commentDraft.trim() || createComment.isPending}
                >
                  <Send size={17} aria-hidden="true" />
                  {createComment.isPending ? '등록 중…' : '댓글 등록'}
                </button>
              </form>
              {commentValidationError ? (
                <p
                  className="field-error community-comment-error"
                  id="community-comment-error"
                >
                  {commentValidationError}
                </p>
              ) : null}
              {createComment.isError ? (
                <p className="form-submit-error" role="alert">
                  {createComment.error instanceof Error
                    ? createComment.error.message
                    : '댓글을 등록하지 못했습니다. 다시 시도해 주세요.'}
                </p>
              ) : null}

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
                        {comment.isMine ? (
                          <button
                            type="button"
                            disabled={deleteComment.isPending}
                            aria-label={`${comment.author.nickname} 댓글 삭제`}
                            onClick={() =>
                              deleteComment.mutate({
                                commentId: comment.commentId,
                              })
                            }
                          >
                            삭제
                          </button>
                        ) : null}
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
              {deleteComment.isError ? (
                <p className="form-submit-error" role="alert">
                  {deleteComment.error instanceof Error
                    ? deleteComment.error.message
                    : '댓글을 삭제하지 못했습니다.'}
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
