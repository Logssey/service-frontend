import type { ErrorResponse } from '@/shared/model/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

let accessTokenProvider: () => string | null = () => null

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorResponse['code'],
    message: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/** 개발자 B의 인증 저장소가 준비되면 이 경계에 토큰 조회 함수를 연결한다. */
export function configureAccessTokenProvider(provider: () => string | null) {
  accessTokenProvider = provider
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = accessTokenProvider()
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const fallback: ErrorResponse = {
      code: 'INTERNAL_ERROR',
      message: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    }
    const error = (await response.json().catch(() => fallback)) as ErrorResponse
    throw new ApiClientError(response.status, error.code, error.message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
