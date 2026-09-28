import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/model/authStore'
import { useChatRealtime } from '@/features/chat/model/useChatRealtime'

const socketMock = vi.hoisted(() => ({
  subscribe: vi.fn((_chatRoomId: number, _listener: (event: string) => void) => {
    void _chatRoomId
    void _listener
    return vi.fn()
  }),
}))

vi.mock('@/features/chat/api/chatSocket', () => ({
  chatSocket: socketMock,
}))

describe('채팅 실시간 게이트웨이', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    useAuthStore.getState().clear()
  })

  it('목록의 방을 공용 소켓으로 구독하고 이벤트 후 REST 목록을 갱신한다', () => {
    vi.stubEnv('VITE_USE_MOCKS', 'false')
    vi.stubEnv('VITE_CHAT_REALTIME', 'true')
    useAuthStore.getState().setSession('access-token', { userId: 3, nickname: '구매자', profileImageUrl: null })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { unmount } = renderHook(() => useChatRealtime([17]), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    expect(socketMock.subscribe).toHaveBeenCalledWith(17, expect.any(Function))
    expect(invalidate).not.toHaveBeenCalled()
    const onEvent = socketMock.subscribe.mock.calls[0][1]
    act(() => onEvent('message'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['chat', 'rooms'] })
    unmount()
    expect(socketMock.subscribe.mock.results[0].value).toHaveBeenCalledOnce()
  })
})
