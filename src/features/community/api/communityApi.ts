import type {
  CommunityCommentCreateRequest,
  CommunityCommentPage,
  CommunityCommentResponse,
  CommunityPostCreateResponse,
  CommunityPostDetailResponse,
  CommunityPostPage,
  CommunityPostSearchRequest,
  CommunityPostWriteRequest,
} from '@/features/community/model/types'
import { mockCommunityRepository } from '@/mocks/communityRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toPostSearchParams(request: CommunityPostSearchRequest) {
  const params = new URLSearchParams()
  if (request.category) params.set('category', request.category)
  if (request.cursor) params.set('cursor', request.cursor)
  params.set('size', String(request.size ?? 20))
  return params
}

function toCursorSearchParams(cursor?: string | null, size = 20) {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('size', String(size))
  return params
}

export const communityApi = {
  async getPosts(
    request: CommunityPostSearchRequest,
  ): Promise<CommunityPostPage> {
    if (useMocks) return mockCommunityRepository.getPosts(request)
    return apiRequest<CommunityPostPage>(
      `/community/posts?${toPostSearchParams(request)}`,
    )
  },

  async getPost(postId: number): Promise<CommunityPostDetailResponse> {
    if (useMocks) return mockCommunityRepository.getPost(postId)
    return apiRequest<CommunityPostDetailResponse>(`/community/posts/${postId}`)
  },

  async getComments(
    postId: number,
    cursor?: string | null,
    size = 20,
  ): Promise<CommunityCommentPage> {
    if (useMocks) {
      return mockCommunityRepository.getComments(postId, cursor, size)
    }
    return apiRequest<CommunityCommentPage>(
      `/community/posts/${postId}/comments?${toCursorSearchParams(cursor, size)}`,
    )
  },

  async createPost(
    request: CommunityPostWriteRequest,
  ): Promise<CommunityPostCreateResponse> {
    if (useMocks) return mockCommunityRepository.createPost(request)
    return apiRequest<CommunityPostCreateResponse>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async updatePost(
    postId: number,
    request: CommunityPostWriteRequest,
  ): Promise<CommunityPostDetailResponse> {
    if (useMocks) return mockCommunityRepository.updatePost(postId, request)
    return apiRequest<CommunityPostDetailResponse>(
      `/community/posts/${postId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      },
    )
  },

  async deletePost(postId: number): Promise<void> {
    if (useMocks) return mockCommunityRepository.deletePost(postId)
    return apiRequest<void>(`/community/posts/${postId}`, { method: 'DELETE' })
  },

  async createComment(
    postId: number,
    request: CommunityCommentCreateRequest,
  ): Promise<CommunityCommentResponse> {
    if (useMocks) return mockCommunityRepository.createComment(postId, request)
    return apiRequest<CommunityCommentResponse>(
      `/community/posts/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    )
  },

  async deleteComment(postId: number, commentId: number): Promise<void> {
    if (useMocks) {
      return mockCommunityRepository.deleteComment(postId, commentId)
    }
    return apiRequest<void>(
      `/community/posts/${postId}/comments/${commentId}`,
      { method: 'DELETE' },
    )
  },
}
