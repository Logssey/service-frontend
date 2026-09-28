import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/model/authStore'
import { chatSocket } from '@/features/chat/api/chatSocket'

/** AUTH-001이 넘겨받는 안내 문구. info는 완료 안내, alert는 다시 로그인하라는 경고다. */
export interface LoginHandover {
  message: string
  tone?: 'info' | 'alert'
}

/**
 * 로그아웃·탈퇴가 끝난 뒤 이 브라우저에 남은 세션을 정리한다(my-account.md "세션 정리 절차").
 *
 * 먼저 로그인 화면으로 옮기고, 이 훅을 쓰는 화면이 실제로 사라질 때 토큰과 캐시를 비운다.
 * - 라우터 이동은 transition이라 곧바로 캐시를 비우면 아직 떠 있는 화면이 다시 그려지며
 *   방금 끝낸 세션으로 조회를 다시 보낸다.
 * - 토큰을 먼저 비우면 로그인 가드가 먼저 반응해 완료 안내 대신 "로그인이 필요합니다."로 보낸다.
 * 화면이 바뀌는 커밋에서 바로 비우므로 Access Token은 사실상 즉시 버려진다(ADR-005).
 * 캐시를 남기면 다른 계정으로 로그인했을 때 이전 사용자의 목록이 잠깐 보인다.
 */
export function useEndSession() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearSession = useAuthStore((state) => state.clear)
  const clearOnUnmount = useRef(false)

  useEffect(
    () => () => {
      if (!clearOnUnmount.current) return
      clearSession()
      queryClient.clear()
    },
    [clearSession, queryClient],
  )

  return useCallback(
    (handover: LoginHandover) => {
      chatSocket.disconnect()
      clearOnUnmount.current = true
      navigate('/login', { replace: true, state: handover })
    },
    [navigate],
  )
}
