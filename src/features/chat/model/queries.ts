import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/features/chat/api/chatApi'
import { tradeKeys } from '@/features/trades/model/queries'

export const chatKeys = {
  all: ['chat'] as const,
  rooms: () => [...chatKeys.all, 'rooms'] as const,
  room: (chatRoomId: number) => [...chatKeys.rooms(), chatRoomId] as const,
  messages: (chatRoomId: number) =>
    [...chatKeys.all, 'messages', chatRoomId] as const,
}

export function useChatRooms() {
  return useInfiniteQuery({
    queryKey: chatKeys.rooms(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => chatApi.getChatRooms(pageParam, 15),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

export function useChatRoom(chatRoomId: number) {
  return useQuery({
    queryKey: chatKeys.room(chatRoomId),
    queryFn: () => chatApi.getChatRoomSummary(chatRoomId),
    enabled: Number.isFinite(chatRoomId),
  })
}

export function useMessages(chatRoomId: number) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(chatRoomId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => chatApi.getMessages(chatRoomId, pageParam, 30),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    enabled: Number.isFinite(chatRoomId),
  })
}

export function useCreateChatRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listingId: number) => chatApi.createChatRoom({ listingId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
      void queryClient.invalidateQueries({ queryKey: tradeKeys.all })
    },
  })
}

export function useSendMessage(chatRoomId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(chatRoomId, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatRoomId) })
      void queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId) })
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
    },
  })
}

export function useDeleteMessage(chatRoomId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: number) => chatApi.deleteMessage(chatRoomId, messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatRoomId) })
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
    },
  })
}

export function useReadMessages(chatRoomId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lastReadMessageId: number) =>
      chatApi.readMessages(chatRoomId, { lastReadMessageId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId) })
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
    },
  })
}
