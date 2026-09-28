import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/model/authStore'
import { AccountSettingsPage } from '@/features/me/pages/AccountSettingsPage'
import { mockAuthRepository } from '@/mocks/authRepository'

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/me/settings']}>
        <Routes>
          <Route path="/me/settings" element={<AccountSettingsPage />} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('계정 설정', () => {
  beforeEach(async () => {
    mockAuthRepository.reset()
    useAuthStore.getState().clear()
    const session = await mockAuthRepository.emailLogin({ email: 'test@reused.dev', password: 'test1234' })
    useAuthStore.getState().setSession(session.accessToken, session.user)
  })

  it('닉네임과 소개를 실제 프로필 저장소에 반영한다', async () => {
    renderSettings()
    fireEvent.change(await screen.findByDisplayValue('테스트계정'), { target: { value: '새닉네임' } })
    fireEvent.change(screen.getByLabelText('소개'), { target: { value: '안녕하세요' } })
    fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }))
    expect(await screen.findByText('프로필을 저장했습니다.')).toBeInTheDocument()
    expect((await mockAuthRepository.me()).nickname).toBe('새닉네임')
    expect((await mockAuthRepository.me()).bio).toBe('안녕하세요')
  })

  it('비밀번호 변경 후 현재 세션을 지우고 로그인으로 이동한다', async () => {
    renderSettings()
    await screen.findByDisplayValue('테스트계정')
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'test1234' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호', { selector: 'input' }), { target: { value: 'new-password-123' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'new-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
    await expect(mockAuthRepository.emailLogin({ email: 'test@reused.dev', password: 'test1234' })).rejects.toThrow()
  })

  it('로그아웃하면 서버 세션과 개인 캐시를 비운 뒤 로그인으로 이동한다', async () => {
    renderSettings()
    await screen.findByDisplayValue('테스트계정')
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
    await expect(mockAuthRepository.me()).rejects.toThrow()
  })

  it('확인한 회원 탈퇴는 계정을 삭제하고 로그인으로 이동한다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderSettings()
    await screen.findByDisplayValue('테스트계정')
    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
    await expect(mockAuthRepository.emailLogin({ email: 'test@reused.dev', password: 'test1234' })).rejects.toThrow()
    vi.restoreAllMocks()
  })
})
