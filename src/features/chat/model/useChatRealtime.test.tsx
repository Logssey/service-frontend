import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/model/authStore'
import { useChatRealtime } from '@/features/chat/model/useChatRealtime'

const socketMock = vi.hoisted(() => ({
  handlers: {} as Record<string, (...args: unknown[]) => void>,
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: (event: string, handler: (...args: unknown[]) => void) => { socketMock.handlers[event] = handler },
    emit: socketMock.emit,
    connect: socketMock.connect,
    disconnect: socketMock.disconnect,
  })),
}))

describe('채팅 실시간 게이트웨이', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    useAuthStore.getState().clear()
  })

  it('토큰을 핸드셰이크 URL에 넣지 않고 연결 후 인증·방 구독한다', () => {
    vi.stubEnv('VITE_USE_MOCKS', 'false')
    useAuthStore.getState().setSession('access-token', { userId: 3, nickname: '구매자', profileImageUrl: null })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { unmount } = renderHook(() => useChatRealtime([17]), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    expect(socketMock.connect).toHaveBeenCalledOnce()
    act(() => socketMock.handlers.connect())
    expect(socketMock.emit).toHaveBeenCalledWith('authenticate', { token: 'access-token' })
    act(() => socketMock.handlers.authenticated())
    expect(socketMock.emit).toHaveBeenCalledWith('subscribe', { chatRoomId: 17 }, expect.any(Function))
    expect(invalidate).not.toHaveBeenCalled()
    const subscribeAck = socketMock.emit.mock.calls.find(([event]) => event === 'subscribe')?.[2]
    act(() => subscribeAck({ ok: true, chatRoomId: 17 }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['chat'] })
    act(() => socketMock.handlers.message())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['chat'] })
    unmount()
    expect(socketMock.emit).toHaveBeenCalledWith('unsubscribe', { chatRoomId: 17 })
    expect(socketMock.disconnect).toHaveBeenCalledOnce()
  })
})
