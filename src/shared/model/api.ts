export interface CursorPageResponse<T> {
  items: T[]
  nextCursor: string | null
  hasNext: boolean
}

export interface ErrorResponse {
  code:
    | 'INVALID_INPUT'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'USER_SUSPENDED'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'
    | 'EXTERNAL_SERVICE_ERROR'
    | 'SERVICE_UNAVAILABLE'
  message: string
}
