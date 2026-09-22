export const communityLimits = {
  title: { min: 2, max: 100 },
  content: { min: 10, max: 3_000 },
  comment: { min: 1, max: 500 },
} as const

function validateLength(
  value: string,
  field: string,
  limits: { min: number; max: number },
) {
  const length = value.trim().length
  if (length < limits.min || length > limits.max) {
    return `${field}은 ${limits.min}자 이상 ${limits.max.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`
  }
  return null
}

export function validateCommunityTitle(value: string) {
  return validateLength(value, '제목', communityLimits.title)
}

export function validateCommunityContent(value: string) {
  return validateLength(value, '본문', communityLimits.content)
}

export function validateCommunityComment(value: string) {
  return validateLength(value, '댓글', communityLimits.comment)
}
