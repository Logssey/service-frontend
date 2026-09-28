import { useQuery } from '@tanstack/react-query'
import { accountApi } from '@/features/account/api/accountApi'
import { authApi } from '@/features/auth/api/authApi'
import { ApiClientError } from '@/shared/api/http'

export const accountKeys = {
  all: ['account'] as const,
  me: () => [...accountKeys.all, 'me'] as const,
  sellerProfile: (userId: number) => [...accountKeys.all, 'seller-profile', userId] as const,
  ongoingTrades: () => [...accountKeys.all, 'ongoing-trades'] as const,
}

/** MY-001 · GET /users/me */
export function useMyProfile() {
  return useQuery({ queryKey: accountKeys.me(), queryFn: () => authApi.me() })
}

/** MY-001 · 평점·거래 수. 내 userId를 알아야 부를 수 있다. */
export function useMySellerProfile(userId: number | undefined) {
  return useQuery({
    queryKey: accountKeys.sellerProfile(userId ?? 0),
    queryFn: () => accountApi.getSellerProfile(userId as number),
    enabled: userId !== undefined,
  })
}

/** MY-003 · 탈퇴하면 취소될 거래 */
export function useOngoingTrades() {
  return useQuery({ queryKey: accountKeys.ongoingTrades(), queryFn: () => accountApi.getOngoingTrades() })
}

/** 재발급까지 실패해 세션이 없는 경우. 공통 복구(authWiring)가 이미 로컬 세션을 비웠다. */
export function isUnauthenticated(error: unknown) {
  return error instanceof ApiClientError && error.status === 401
}
