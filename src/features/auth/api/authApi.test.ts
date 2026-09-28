import { afterEach, describe, expect, it, vi } from 'vitest'

describe('refresh token rotation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('shares one refresh request among concurrent callers', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'false')
    vi.stubEnv('VITE_USE_MOCKS_AUTH', 'false')
    vi.resetModules()
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(Response.json({ accessToken: 'fresh-token' })))
    vi.stubGlobal('fetch', fetchMock)
    const { authApi } = await import('@/features/auth/api/authApi')
    const { configureAccessTokenProvider } = await import('@/shared/api/http')
    configureAccessTokenProvider(() => 'expired-access-token')
    const first = authApi.refresh()
    const second = authApi.refresh()
    expect(first).toBe(second)
    expect(await first).toEqual({ accessToken: 'fresh-token' })
    expect(await second).toEqual({ accessToken: 'fresh-token' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
    await authApi.refresh()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
