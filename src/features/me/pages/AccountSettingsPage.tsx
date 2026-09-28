import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogoutDialog } from '@/features/account/components/LogoutDialog'
import { accountKeys, useMyProfile } from '@/features/account/model/queries'
import { useEndSession } from '@/features/account/model/useEndSession'
import { authApi } from '@/features/auth/api/authApi'
import { deleteProfileUpload, uploadProfileImage } from '@/features/auth/api/profileImageApi'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'
import { describePasswordProblem, isNicknameShaped, isPasswordAcceptable } from '@/features/auth/lib/passwordPolicy'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ApiClientError } from '@/shared/api/http'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import './accountSettings.css'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback
}

export function AccountSettingsPage() {
  const endSession = useEndSession()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const profileQuery = useMyProfile()
  const profile = profileQuery.data
  const [nicknameInput, setNicknameInput] = useState<string | null>(null)
  const [bioInput, setBioInput] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [profilePending, setProfilePending] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  const nickname = nicknameInput ?? profile?.nickname ?? ''
  const bio = bioInput ?? profile?.bio ?? ''

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile || !isNicknameShaped(nickname) || profilePending) return
    setProfilePending(true)
    setProfileMessage(null)
    let uploadedImageId: number | null = null
    try {
      if (image) uploadedImageId = await uploadProfileImage(image)
      const updated = await authApi.updateProfile({
        ...(nickname.trim() !== profile.nickname ? { nickname: nickname.trim() } : {}),
        ...(bio.trim() !== (profile.bio ?? '') ? { bio: bio.trim() || null } : {}),
        ...(uploadedImageId !== null ? { imageId: uploadedImageId } : removeImage ? { imageId: null } : {}),
      })
      setUser({ userId: updated.userId, nickname: updated.nickname, profileImageUrl: updated.profileImageUrl })
      queryClient.setQueryData(accountKeys.me(), updated)
      await queryClient.invalidateQueries({ queryKey: accountKeys.sellerProfile(updated.userId) })
      setNicknameInput(null)
      setBioInput(null)
      setImage(null)
      setRemoveImage(false)
      setProfileMessage('프로필을 저장했습니다.')
    } catch (error) {
      if (uploadedImageId !== null) await deleteProfileUpload(uploadedImageId).catch(() => {})
      setProfileMessage(errorMessage(error, '프로필을 저장하지 못했습니다.'))
    } finally {
      setProfilePending(false)
    }
  }

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentPassword || !isPasswordAcceptable(newPassword) || newPassword !== confirmPassword || passwordPending) return
    setPasswordPending(true)
    setPasswordError(null)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      endSession({ message: '비밀번호가 변경됐습니다. 다시 로그인해 주세요.', tone: 'info' })
    } catch (error) {
      setPasswordError(errorMessage(error, '비밀번호를 변경하지 못했습니다.'))
      setPasswordPending(false)
    }
  }

  if (profileQuery.isLoading) return <div className="app-page"><PageHeader title="계정 설정" /><LoadingState label="내 정보를 불러오는 중" /></div>
  if (profileQuery.isError || !profile) return <div className="app-page"><PageHeader title="계정 설정" /><ErrorState title="내 정보를 불러오지 못했어요" retry={() => void profileQuery.refetch()} /></div>

  return (
    <div className="app-page collection-page account-settings-page">
      <PageHeader title="계정 설정" action={<Link className="text-action" to="/me">마이페이지</Link>} />
      <main className="content-shell account-settings">
        <section className="account-settings__section">
          <h1>프로필</h1>
          <p>거래 상대에게 표시되는 정보를 변경할 수 있습니다.</p>
          <form className="auth-form" onSubmit={(event) => void submitProfile(event)}>
            <ProfileImagePicker
              label="프로필 사진 변경"
              value={image}
              currentUrl={removeImage ? null : profile.profileImageUrl}
              onChange={(file) => { setImage(file); setRemoveImage(false) }}
              disabled={profilePending || profile.role !== 'USER'}
            />
            {profile.profileImageUrl && !removeImage ? (
              <button type="button" className="text-action" disabled={profilePending} onClick={() => { setImage(null); setRemoveImage(true) }}>
                현재 사진 삭제
              </button>
            ) : null}
            <label className="field">
              <span className="field__label">닉네임</span>
              <input value={nickname} maxLength={20} onChange={(event) => setNicknameInput(event.target.value)} disabled={profilePending || profile.role !== 'USER'} />
            </label>
            <label className="field">
              <span className="field__label">소개</span>
              <textarea value={bio} maxLength={200} rows={3} onChange={(event) => setBioInput(event.target.value)} disabled={profilePending || profile.role !== 'USER'} />
            </label>
            {profileMessage ? <p role="status" className="field-help">{profileMessage}</p> : null}
            <button className="button button--primary" type="submit" disabled={profilePending || !isNicknameShaped(nickname) || profile.role !== 'USER'}>
              {profilePending ? '저장 중…' : '프로필 저장'}
            </button>
          </form>
        </section>

        <section className="account-settings__section">
          <h2>로그인 정보</h2>
          <p>로그인 방법: {profile.provider === 'LOCAL' ? '이메일' : '카카오'}</p>
          <p>이메일: {profile.email ?? '등록되지 않음'} {profile.email && !profile.emailVerified ? <Link to="/verify-email">인증하기</Link> : null}</p>
          <button className="button button--secondary" type="button" onClick={() => setConfirmingLogout(true)}>로그아웃</button>
          {profile.provider === 'LOCAL' && profile.role === 'USER' ? (
            <form className="auth-form" onSubmit={(event) => void submitPassword(event)}>
              <PasswordField label="현재 비밀번호" value={currentPassword} placeholder="현재 비밀번호" autoComplete="current-password" onChange={setCurrentPassword} />
              <PasswordField label="새 비밀번호" value={newPassword} placeholder="8자 이상" autoComplete="new-password" onChange={setNewPassword} />
              <PasswordField label="새 비밀번호 확인" value={confirmPassword} placeholder="새 비밀번호 재입력" autoComplete="new-password" onChange={setConfirmPassword} />
              {describePasswordProblem(newPassword) ? <p className="field-error" role="alert">{describePasswordProblem(newPassword)}</p> : null}
              {confirmPassword && newPassword !== confirmPassword ? <p className="field-error" role="alert">새 비밀번호가 일치하지 않습니다.</p> : null}
              {passwordError ? <p className="field-error" role="alert">{passwordError}</p> : null}
              <button className="button button--secondary" type="submit" disabled={passwordPending || !currentPassword || !isPasswordAcceptable(newPassword) || newPassword !== confirmPassword}>
                {passwordPending ? '변경 중…' : '비밀번호 변경'}
              </button>
            </form>
          ) : null}
        </section>

        {profile.role === 'USER' ? (
          <section className="account-settings__section account-settings__danger">
            <h2>회원 탈퇴</h2>
            <p>탈퇴하면 계정이 삭제되고 진행 중인 거래가 취소됩니다.</p>
            <Link className="button button--secondary" to="/me/withdraw">회원 탈퇴</Link>
          </section>
        ) : null}
      </main>
      {confirmingLogout ? <LogoutDialog onClose={() => setConfirmingLogout(false)} /> : null}
    </div>
  )
}
