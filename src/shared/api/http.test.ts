import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiRequest,
  configureAccessTokenProvider,
  configureUnauthorizedRecovery,
} from '@/shared/api/http'

describe('API 401 recovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    configureAccessTokenProvider(() => null)
    configureUnauthorizedRecovery(async () => false)
  })

  it('retries with an already refreshed token without rotating it again', async () => {
    let token = 'old-token'
    let respondWith401: (response: Response) => void = () => {}
    const firstResponse = new Promise<Response>((resolve) => { respondWith401 = resolve })
    const fetchMock = vi.fn().mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    configureAccessTokenProvider(() => token)
    const recover = vi.fn(async () => true)
    configureUnauthorizedRecovery(recover)

    const pending = apiRequest<{ ok: boolean }>('/probe')
    token = 'fresh-token'
    respondWith401(new Response(null, { status: 401 }))
    expect(await pending).toEqual({ ok: true })
    expect(recover).not.toHaveBeenCalled()
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer fresh-token')
  })

  it('uses one recovery for concurrent 401 responses', async () => {
    let token = 'expired'
    let finishRefresh = () => {}
    const recovery = vi.fn(() => new Promise<boolean>((resolve) => {
      finishRefresh = () => {
        token = 'renewed'
        resolve(true)
      }
    }))
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

  it('omits a stale access token for public authentication requests', async () => {
    configureAccessTokenProvider(() => 'expired')
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/auth/refresh', { method: 'POST' }, { omitAccessToken: true, skipAuthRecovery: true })

    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false)
  })
})
