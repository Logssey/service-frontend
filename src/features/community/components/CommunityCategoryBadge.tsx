import { communityCategoryLabels } from '@/features/community/model/labels'
import type { CommunityCategory } from '@/features/community/model/types'

export function CommunityCategoryBadge({
  category,
}: {
  category: CommunityCategory
}) {
  return (
    <span
      className={`community-category-badge community-category-badge--${category.toLowerCase()}`}
    >
      {communityCategoryLabels[category]}
    </span>
  )
}
