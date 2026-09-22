import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { communityApi } from '@/features/community/api/communityApi'
import type {
  CommunityCategory,
  CommunityCommentCreateRequest,
  CommunityPostWriteRequest,
} from '@/features/community/model/types'

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

export function useCreateCommunityPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CommunityPostWriteRequest) =>
      communityApi.createPost(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: communityKeys.lists() })
    },
  })
}

export function useUpdateCommunityPost(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CommunityPostWriteRequest) =>
      communityApi.updatePost(postId, request),
    onSuccess: (post) => {
      queryClient.setQueryData(communityKeys.detail(postId), post)
      void queryClient.invalidateQueries({ queryKey: communityKeys.lists() })
    },
  })
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => communityApi.deletePost(postId),
    onSuccess: (_response, postId) => {
      queryClient.removeQueries({ queryKey: communityKeys.detail(postId) })
      void queryClient.invalidateQueries({ queryKey: communityKeys.lists() })
    },
  })
}

export function useCreateCommunityComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CommunityCommentCreateRequest) =>
      communityApi.createComment(postId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityKeys.comments(postId),
      })
      void queryClient.invalidateQueries({
        queryKey: communityKeys.detail(postId),
      })
      void queryClient.invalidateQueries({ queryKey: communityKeys.lists() })
    },
  })
}

export function useDeleteCommunityComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number }) =>
      communityApi.deleteComment(postId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityKeys.comments(postId),
      })
      void queryClient.invalidateQueries({
        queryKey: communityKeys.detail(postId),
      })
      void queryClient.invalidateQueries({ queryKey: communityKeys.lists() })
    },
  })
}
