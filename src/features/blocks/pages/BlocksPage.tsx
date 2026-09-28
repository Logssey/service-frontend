import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blocksApi } from '@/features/blocks/api/blocksApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import '@/features/reports/reportFlows.css'

export function BlocksPage() {
  const client = useQueryClient()
  const query = useInfiniteQuery({
    queryKey: ['blocks'], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => blocksApi.list(pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const remove = useMutation({ mutationFn: blocksApi.remove, onSuccess: () => client.invalidateQueries({ queryKey: ['blocks'] }) })
  const blocks = query.data?.pages.flatMap((page) => page.items) ?? []
  return <div className="app-page collection-page">
    <PageHeader title="차단한 사용자" />
    <main className="content-shell">
      {query.isLoading && <LoadingState label="차단 목록을 불러오는 중" />}
      {query.isError && <ErrorState title="차단 목록을 불러오지 못했어요" retry={() => void query.refetch()} />}
      {query.isSuccess && blocks.length === 0 && <EmptyState title="차단한 사용자가 없습니다" description="사용자 프로필이나 채팅에서 차단할 수 있습니다." />}
      <div className="admin-table-card"><ul>{blocks.map((block) => <li key={block.blockId}>
        <strong>{block.blockedUser.nickname}</strong> <small>#{block.blockedUser.userId}</small>
        <button className="button button--secondary" type="button" disabled={remove.isPending} onClick={() => remove.mutate(block.blockedUser.userId)}>차단 해제</button>
      </li>)}</ul></div>
      {remove.isError && <p className="field-error" role="alert">{remove.error.message}</p>}
      {query.hasNextPage && <button className="load-more" type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>더 보기</button>}
    </main><MobileBottomNavigation />
  </div>
}
