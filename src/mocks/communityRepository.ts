import type {
  CommunityCommentCreateRequest,
  CommunityCommentPage,
  CommunityCommentResponse,
  CommunityPostCreateResponse,
  CommunityPostDetailResponse,
  CommunityPostPage,
  CommunityPostSearchRequest,
  CommunityPostSummaryResponse,
  CommunityPostWriteRequest,
} from '@/features/community/model/types'
import {
  validateCommunityComment,
  validateCommunityContent,
  validateCommunityTitle,
} from '@/features/community/model/validation'
import { ApiClientError } from '@/shared/api/http'

const CURRENT_USER_ID = 3

const initialPosts: CommunityPostDetailResponse[] = [
  {
    postId: 207,
    category: 'TIP',
    title: '직거래 전에 확인하면 좋은 세 가지',
    content:
      '제품 작동 여부와 구성품, 거래 장소를 채팅에서 먼저 확인해 두면 현장에서 훨씬 편하게 거래할 수 있어요.',
    author: { userId: 12, nickname: '차분한거래' },
    commentCount: 0,
    viewCount: 84,
    isMine: false,
    createdAt: '2026-09-22T03:30:00Z',
    updatedAt: null,
  },
  {
    postId: 206,
    category: 'QUESTION',
    title: '중고 책 여러 권을 보낼 때 포장 방법이 궁금해요',
    content:
      '책 모서리가 상하지 않도록 포장하고 싶은데 좋은 방법이 있을까요? 비 오는 날에도 안전한 포장 팁을 알고 싶습니다.',
    author: { userId: 31, nickname: '조명찾는사람' },
    commentCount: 0,
    viewCount: 29,
    isMine: false,
    createdAt: '2026-09-22T02:10:00Z',
    updatedAt: null,
  },
  {
    postId: 205,
    category: 'GENERAL',
    title: '우리 동네 직거래 장소를 추천해요',
    content:
      '역 2번 출구 앞 안내 데스크 근처가 밝고 사람이 많아서 저녁 직거래 장소로 편했습니다. 서로 찾기도 쉬웠어요.',
    author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
    commentCount: 0,
    viewCount: 51,
    isMine: true,
    createdAt: '2026-09-21T12:45:00Z',
    updatedAt: '2026-09-21T13:02:00Z',
  },
  {
    postId: 204,
    category: 'SHARE',
    title: '사용하지 않던 유아 의자를 나눔했어요',
    content:
      '보관만 하던 의자를 필요한 이웃에게 나눔했습니다. 깨끗하게 닦아 전달하니 기분 좋은 거래가 되었어요.',
    author: { userId: 18, nickname: '정리중이에요' },
    commentCount: 0,
    viewCount: 73,
    isMine: false,
    createdAt: '2026-09-21T08:20:00Z',
    updatedAt: null,
  },
  {
    postId: 203,
    category: 'TIP',
    title: '전자기기 초기화는 거래 직전에 다시 확인하세요',
    content:
      '계정 로그아웃과 공장 초기화를 마친 뒤에도 기기 찾기 기능이 해제됐는지 한 번 더 확인하면 안전합니다.',
    author: { userId: 5, nickname: '판매왕' },
    commentCount: 0,
    viewCount: 116,
    isMine: false,
    createdAt: '2026-09-20T10:05:00Z',
    updatedAt: null,
  },
  {
    postId: 202,
    category: 'QUESTION',
    title: '택배 거래할 때 포장 팁이 있을까요?',
    content:
      '작은 카메라를 택배로 보내려 합니다. 완충재를 어느 정도 사용해야 안전할지 경험을 나눠 주세요.',
    author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
    commentCount: 0,
    viewCount: 47,
    isMine: true,
    createdAt: '2026-09-19T07:40:00Z',
    updatedAt: null,
  },
  {
    postId: 201,
    category: 'GENERAL',
    title: '직거래 약속 시간, 이렇게 정하니 편했어요',
    content:
      '서로 도착 시간을 다시 확인할 수 있도록 약속 한 시간 전에 채팅을 남기니 기다리는 시간을 줄일 수 있었습니다.',
    author: { userId: 8, nickname: '필름한장' },
    commentCount: 0,
    viewCount: 92,
    isMine: false,
    createdAt: '2026-09-18T04:15:00Z',
    updatedAt: null,
  },
]

const initialComments: Record<number, CommunityCommentResponse[]> = {
  205: [
    {
      commentId: 502,
      content: '저도 그곳에서 거래했는데 찾기 쉬워서 좋았어요.',
      author: { userId: 8, nickname: '필름한장' },
      isMine: false,
      createdAt: '2026-09-21T13:20:00Z',
    },
    {
      commentId: 503,
      content: '주말에도 안내 데스크가 열려 있는지 확인해 봐야겠네요.',
      author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
      isMine: true,
      createdAt: '2026-09-21T13:42:00Z',
    },
  ],
  207: [
    {
      commentId: 504,
      content: '구성품을 사진으로 남겨 두는 것도 도움이 됐어요.',
      author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
      isMine: true,
      createdAt: '2026-09-22T04:02:00Z',
    },
  ],
}

let posts = structuredClone(initialPosts)
let comments = structuredClone(initialComments)
let nextPostId = 208
let nextCommentId = 505

const wait = (milliseconds = 120) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cursorToOffset(cursor?: string | null) {
  if (!cursor) return 0
  const offset = Number.parseInt(atob(cursor), 10)
  return Number.isNaN(offset) ? 0 : offset
}

function getPostOrThrow(postId: number) {
  const post = posts.find((item) => item.postId === postId)
  if (!post) {
    throw new ApiClientError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.')
  }
  return post
}

function assertPostOwner(post: CommunityPostDetailResponse) {
  if (!post.isMine) {
    throw new ApiClientError(403, 'FORBIDDEN', '내 게시글만 변경할 수 있습니다.')
  }
}

function assertValidPost(request: CommunityPostWriteRequest) {
  const message =
    validateCommunityTitle(request.title) ??
    validateCommunityContent(request.content)
  if (message) throw new ApiClientError(400, 'INVALID_INPUT', message)
}

function assertValidComment(request: CommunityCommentCreateRequest) {
  const message = validateCommunityComment(request.content)
  if (message) throw new ApiClientError(400, 'INVALID_INPUT', message)
}

function synchronizeCommentCount(post: CommunityPostDetailResponse) {
  return {
    ...post,
    commentCount: comments[post.postId]?.length ?? 0,
  }
}

function toSummary(
  post: CommunityPostDetailResponse,
): CommunityPostSummaryResponse {
  const synchronized = synchronizeCommentCount(post)
  return {
    postId: synchronized.postId,
    category: synchronized.category,
    title: synchronized.title,
    excerpt: synchronized.content,
    author: synchronized.author,
    commentCount: synchronized.commentCount,
    viewCount: synchronized.viewCount,
    isMine: synchronized.isMine,
    createdAt: synchronized.createdAt,
    updatedAt: synchronized.updatedAt,
  }
}

export const mockCommunityRepository = {
  async getPosts(
    request: CommunityPostSearchRequest,
  ): Promise<CommunityPostPage> {
    await wait()
    const offset = cursorToOffset(request.cursor)
    const size = request.size ?? 20
    const filtered = posts
      .filter(
        (post) => request.category === null || post.category === request.category,
      )
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    const pageItems = filtered.slice(offset, offset + size).map(toSummary)
    const nextOffset = offset + pageItems.length

    return {
      items: structuredClone(pageItems),
      nextCursor:
        nextOffset < filtered.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < filtered.length,
    }
  },

  async getPost(postId: number): Promise<CommunityPostDetailResponse> {
    await wait(80)
    return structuredClone(synchronizeCommentCount(getPostOrThrow(postId)))
  },

  async getComments(
    postId: number,
    cursor?: string | null,
    size = 20,
  ): Promise<CommunityCommentPage> {
    await wait()
    getPostOrThrow(postId)
    const offset = cursorToOffset(cursor)
    const sorted = [...(comments[postId] ?? [])].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    const pageItems = sorted.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: structuredClone(pageItems),
      nextCursor: nextOffset < sorted.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < sorted.length,
    }
  },

  async createPost(
    request: CommunityPostWriteRequest,
  ): Promise<CommunityPostCreateResponse> {
    await wait()
    assertValidPost(request)
    const postId = nextPostId++
    posts.push({
      postId,
      category: request.category,
      title: request.title.trim(),
      content: request.content.trim(),
      author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
      commentCount: 0,
      viewCount: 0,
      isMine: true,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    comments[postId] = []
    return { postId }
  },

  async updatePost(
    postId: number,
    request: CommunityPostWriteRequest,
  ): Promise<CommunityPostDetailResponse> {
    await wait()
    const post = getPostOrThrow(postId)
    assertPostOwner(post)
    assertValidPost(request)
    post.category = request.category
    post.title = request.title.trim()
    post.content = request.content.trim()
    post.updatedAt = new Date().toISOString()
    return structuredClone(synchronizeCommentCount(post))
  },

  async deletePost(postId: number): Promise<void> {
    await wait()
    const post = getPostOrThrow(postId)
    assertPostOwner(post)
    posts = posts.filter((item) => item.postId !== postId)
    delete comments[postId]
  },

  async createComment(
    postId: number,
    request: CommunityCommentCreateRequest,
  ): Promise<CommunityCommentResponse> {
    await wait(90)
    getPostOrThrow(postId)
    assertValidComment(request)
    const comment: CommunityCommentResponse = {
      commentId: nextCommentId++,
      content: request.content.trim(),
      author: { userId: CURRENT_USER_ID, nickname: '다시쓰는사람' },
      isMine: true,
      createdAt: new Date().toISOString(),
    }
    comments[postId] = [...(comments[postId] ?? []), comment]
    return structuredClone(comment)
  },

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await wait(80)
    getPostOrThrow(postId)
    const comment = comments[postId]?.find(
      (item) => item.commentId === commentId,
    )
    if (!comment) {
      throw new ApiClientError(404, 'NOT_FOUND', '댓글을 찾을 수 없습니다.')
    }
    if (!comment.isMine) {
      throw new ApiClientError(403, 'FORBIDDEN', '내 댓글만 삭제할 수 있습니다.')
    }
    comments[postId] = (comments[postId] ?? []).filter(
      (item) => item.commentId !== commentId,
    )
  },

  reset() {
    posts = structuredClone(initialPosts)
    comments = structuredClone(initialComments)
    nextPostId = 208
    nextCommentId = 505
  },
}
