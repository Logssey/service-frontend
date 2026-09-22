import { create } from 'zustand'
import type { UserSummaryResponse } from '@/features/auth/model/types'

/**
 * 로그인 세션.
 *
 * Access Token은 XSS 노출면을 줄이기 위해 메모리에만 둔다(api-spec §0.4).
 * 그래서 새로고침하면 사라지고, 스플래시에서 Refresh Token 쿠키로 다시 받아온다.
 * signupToken은 가입 절차 중에만 쓰는 10분짜리 단기 토큰이다.
 */
interface AuthStore {
  accessToken: string | null
  user: UserSummaryResponse | null
  signupToken: string | null
  setSession: (accessToken: string, user: UserSummaryResponse | null) => void
  setAccessToken: (accessToken: string) => void
  setSignupToken: (signupToken: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  signupToken: null,
  setSession: (accessToken, user) => set({ accessToken, user, signupToken: null }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setSignupToken: (signupToken) => set({ signupToken }),
  clear: () => set({ accessToken: null, user: null, signupToken: null }),
}))

/**
 * React 밖에서 세션을 읽고 쓰기 위한 통로.
 *
 * shared/api/http.ts는 훅을 쓸 수 없는 모듈이라 이 함수들로 토큰에 접근한다.
 */
export const authSession = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (accessToken: string) => useAuthStore.getState().setAccessToken(accessToken),
  clear: () => useAuthStore.getState().clear(),
}
