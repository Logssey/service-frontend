import type { CommunityCategory } from '@/features/community/model/types'

export const communityCategoryOptions: Array<{
  value: CommunityCategory
  label: string
}> = [
  { value: 'GENERAL', label: '자유' },
  { value: 'QUESTION', label: '질문' },
  { value: 'TIP', label: '거래 팁' },
  { value: 'SHARE', label: '나눔 후기' },
]

export const communityCategoryLabels: Record<CommunityCategory, string> = {
  GENERAL: '자유',
  QUESTION: '질문',
  TIP: '거래 팁',
  SHARE: '나눔 후기',
}

export function isCommunityCategory(
  value: string | null,
): value is CommunityCategory {
  return communityCategoryOptions.some((option) => option.value === value)
}
