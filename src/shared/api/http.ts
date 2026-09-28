import type { ErrorResponse } from '@/shared/model/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

let accessTokenProvider: () => string | null = () => null
let unauthorizedRecovery: (() => Promise<boolean>) | null = null
let recoveryInFlight: Promise<boolean> | null = null

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

/**
 * 401을 받았을 때 세션을 복구할 방법을 등록한다.
 *
 * Access Token은 30분짜리라 화면을 오래 열어두면 반드시 만료된다(ADR-005).
 * 복구에 성공하면 원래 요청을 한 번만 다시 보낸다.
 */
export function configureUnauthorizedRecovery(recovery: () => Promise<boolean>) {
  unauthorizedRecovery = recovery
}

/**
 * 등록된 복구를 실행한다. 동시에 여러 곳에서 불러도 재발급 요청은 하나만 보낸다.
 *
 * Refresh Token은 한 번 쓰면 폐기되고, 폐기된 토큰이 다시 오면 서버가 탈취로 보고
 * 그 사용자의 세션을 모두 끊는다(ADR-005). 화면 하나가 여러 쿼리를 동시에 다시 불러
 * 401이 겹쳐도 같은 쿠키로 재발급을 두 번 보내면 안 된다.
 */
export function recoverSession(): Promise<boolean> {
  if (!unauthorizedRecovery) return Promise.resolve(false)
  recoveryInFlight ??= unauthorizedRecovery().finally(() => {
    recoveryInFlight = null
  })
  return recoveryInFlight
}

export interface ApiRequestOptions {
  /** 재발급 요청처럼 401 복구를 시도해도 의미가 없는 호출에 쓴다. */
  skipAuthRecovery?: boolean
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  let response = await send(path, init)

  if (response.status === 401 && !options.skipAuthRecovery && unauthorizedRecovery) {
    const recovered = await recoverSession()
    if (recovered) {
      response = await send(path, init)
    }
  }

  return toResult<T>(response)
}

function send(path: string, init: RequestInit) {
  const token = accessTokenProvider()
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
}

async function toResult<T>(response: Response): Promise<T> {
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
