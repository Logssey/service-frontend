import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { communityApi } from '@/features/community/api/communityApi'
import type { CommunityCategory } from '@/features/community/model/types'

export const communityKeys = {
  all: ['community'] as const,
  lists: () => [...communityKeys.all, 'posts'] as const,
  list: (category: CommunityCategory | null) =>
    [...communityKeys.lists(), category ?? 'ALL'] as const,
  details: () => [...communityKeys.all, 'post'] as const,
  detail: (postId: number) => [...communityKeys.details(), postId] as const,
  comments: (postId: number) =>
    [...communityKeys.detail(postId), 'comments'] as const,
}

export function useCommunityPosts(category: CommunityCategory | null) {
  return useInfiniteQuery({
    queryKey: communityKeys.list(category),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      communityApi.getPosts({ category, cursor: pageParam, size: 5 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

export function useCommunityPost(postId: number) {
  return useQuery({
    queryKey: communityKeys.detail(postId),
    queryFn: () => communityApi.getPost(postId),
    enabled: Number.isFinite(postId) && postId > 0,
  })
}

export function useCommunityComments(postId: number) {
  return useInfiniteQuery({
    queryKey: communityKeys.comments(postId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      communityApi.getComments(postId, pageParam, 5),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    enabled: Number.isFinite(postId) && postId > 0,
  })
}
