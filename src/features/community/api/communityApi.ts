import type {
  CommunityCommentPage,
  CommunityPostDetailResponse,
  CommunityPostPage,
  CommunityPostSearchRequest,
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
}
