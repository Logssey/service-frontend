import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, configureAccessTokenProvider, configureUnauthorizedRecovery } from '@/shared/api/http'

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
})
