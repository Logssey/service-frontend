import { Eye, MessageCircle, MessagesSquare, SquarePen } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { CommunityCategoryBadge } from '@/features/community/components/CommunityCategoryBadge'
import {
  communityCategoryOptions,
  isCommunityCategory,
} from '@/features/community/model/labels'
import { useCommunityPosts } from '@/features/community/model/queries'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
})

export function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryValue = searchParams.get('category')
  const category = isCommunityCategory(categoryValue) ? categoryValue : null
  const postsQuery = useCommunityPosts(category)
  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? []

  const selectCategory = (nextCategory: typeof category) => {
    setSearchParams(nextCategory ? { category: nextCategory } : {})
  }

  return (
    <div className="app-page collection-page community-page">
      <PageHeader
        title="커뮤니티"
        action={
          <Link className="icon-button" to="/community/new" aria-label="글쓰기">
            <SquarePen size={20} aria-hidden="true" />
          </Link>
        }
      />
      <main className="content-shell community-content">
        <div className="collection-heading community-heading">
          <div>
            <span className="eyebrow">
              <MessagesSquare size={15} aria-hidden="true" />
              이웃과 나누는 거래 이야기
            </span>
            <h1>커뮤니티 게시판</h1>
          </div>
          {!postsQuery.isLoading ? <span>불러온 글 {posts.length}개</span> : null}
        </div>

        <nav className="community-category-filter" aria-label="게시글 카테고리">
          <button
            className={category === null ? 'is-active' : undefined}
            type="button"
            aria-pressed={category === null}
            onClick={() => selectCategory(null)}
          >
            전체
          </button>
          {communityCategoryOptions.map((option) => (
            <button
              className={category === option.value ? 'is-active' : undefined}
              type="button"
              aria-pressed={category === option.value}
              onClick={() => selectCategory(option.value)}
              key={option.value}
            >
              {option.label}
            </button>
          ))}
        </nav>

        {postsQuery.isLoading ? (
          <LoadingState label="커뮤니티 글을 불러오는 중" />
        ) : null}
        {postsQuery.isError ? (
          <ErrorState
            title="커뮤니티 글을 불러오지 못했어요"
            retry={() => void postsQuery.refetch()}
          />
        ) : null}
        {postsQuery.isSuccess && posts.length === 0 ? (
          <EmptyState
            title="이 카테고리에는 아직 글이 없어요"
            description="첫 번째 거래 이야기를 남겨 보세요."
          />
        ) : null}
        {posts.length > 0 ? (
          <div className="community-post-list">
            {posts.map((post) => (
              <Link
                className="community-post-card"
                to={`/community/${post.postId}`}
                key={post.postId}
              >
                <span className="community-post-card__topline">
                  <CommunityCategoryBadge category={post.category} />
                  {post.isMine ? <span className="community-mine-badge">내 글</span> : null}
                </span>
                <h2>{post.title}</h2>
                <span className="community-post-card__preview">{post.preview}</span>
                <span className="community-post-card__meta">
                  <span>
                    {post.author.nickname} ·{' '}
                    <time dateTime={post.createdAt}>
                      {dateFormatter.format(new Date(post.createdAt))}
                    </time>
                  </span>
                  <span>
                    <span aria-label={`조회 ${post.viewCount}회`}>
                      <Eye aria-hidden="true" />
                      {post.viewCount}
                    </span>
                    <span aria-label={`댓글 ${post.commentCount}개`}>
                      <MessageCircle aria-hidden="true" />
                      {post.commentCount}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : null}
        {postsQuery.hasNextPage ? (
          <button
            className="load-more"
            type="button"
            disabled={postsQuery.isFetchingNextPage}
            onClick={() => void postsQuery.fetchNextPage()}
          >
            {postsQuery.isFetchingNextPage ? '불러오는 중…' : '게시글 더 보기'}
          </button>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
