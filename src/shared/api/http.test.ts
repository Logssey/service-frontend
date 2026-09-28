import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiRequest,
  configureAccessTokenProvider,
  configureUnauthorizedRecovery,
} from '@/shared/api/http'

describe('401 세션 복구', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('동시에 401이 나도 재발급은 한 번만 하고 두 요청 모두 새 토큰으로 다시 보낸다', async () => {
    let token = 'expired'
    let finishRefresh = () => {}
    const recovery = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishRefresh = () => {
            token = 'renewed'
            resolve(true)
          }
        }),
    )
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      new Headers(init.headers).get('Authorization') === 'Bearer renewed'
        ? new Response('{"ok":true}', { status: 200 })
        : new Response('{}', { status: 401 }),
    )
    configureAccessTokenProvider(() => token)
    configureUnauthorizedRecovery(recovery)
    vi.stubGlobal('fetch', fetchMock)

    const requests = Promise.all([apiRequest('/chat-rooms'), apiRequest('/trades')])
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    finishRefresh()

    await expect(requests).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(recovery).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
