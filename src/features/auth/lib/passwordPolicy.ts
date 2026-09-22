/**
 * 비밀번호·이메일 입력 규칙.
 *
 * 화면설계서 AUTH-003이 "8자 이상"으로 표기하고 있어 그 값을 쓴다.
 * 아카이브 NFR-SEC-008은 최소 12자를 요구하는데, 수동 테스트 편의를 위해 8자로 낮추기로
 * 결정한 상태다. 최종 검증은 서버가 수행한다(NFR-AUTH-010).
 */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 20

/** 화면 단계에서 걸러내는 최소 형식. 정밀한 검증은 서버가 한다. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailShaped(email: string) {
  return EMAIL_PATTERN.test(email.trim())
}

export function describePasswordProblem(password: string): string | null {
  if (password.length === 0) return null
  if (password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다`
  if (password.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다`
  return null
}

export function isPasswordAcceptable(password: string) {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX
}

export function isNicknameShaped(nickname: string) {
  const trimmed = nickname.trim()
  return trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX
}
