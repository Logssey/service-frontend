export function validateModerationReason(reason: string) {
  const length = reason.trim().length
  if (length === 0) return '조치 사유를 입력해 주세요.'
  if (length > 500) return '조치 사유는 500자 이하로 입력해 주세요.'
  return null
}
