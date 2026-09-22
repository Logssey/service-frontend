import type { CursorPageResponse } from '@/shared/model/api'

export type CommunityCategory = 'GENERAL' | 'QUESTION' | 'TIP' | 'SHARE'

export interface CommunityAuthorResponse {
  userId: number | null
  nickname: string
}

export interface CommunityPostSummaryResponse {
  postId: number
  category: CommunityCategory
  title: string
  preview: string
  author: CommunityAuthorResponse
  commentCount: number
  viewCount: number
  isMine: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CommunityPostDetailResponse
  extends Omit<CommunityPostSummaryResponse, 'preview'> {
  content: string
}

export interface CommunityCommentResponse {
  commentId: number
  postId: number
  content: string
  author: CommunityAuthorResponse
  isMine: boolean
  createdAt: string
}

export interface CommunityPostSearchRequest {
  category: CommunityCategory | null
  cursor?: string | null
  size?: number
}

export interface CommunityPostWriteRequest {
  category: CommunityCategory
  title: string
  content: string
}

export interface CommunityPostCreateResponse {
  postId: number
}

export interface CommunityCommentCreateRequest {
  content: string
}

export type CommunityPostPage = CursorPageResponse<CommunityPostSummaryResponse>
export type CommunityCommentPage = CursorPageResponse<CommunityCommentResponse>
