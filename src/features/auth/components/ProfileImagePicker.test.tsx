import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker'

function PickerHarness() {
  const [file, setFile] = useState<File | null>(null)
  return <ProfileImagePicker label="프로필 사진" value={file} onChange={setFile} />
}

describe('프로필 사진 선택', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test-profile')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('지원 형식 이미지를 미리 보여준다', () => {
    render(<PickerHarness />)
    fireEvent.change(screen.getByLabelText('프로필 사진', { selector: 'input' }), {
      target: { files: [new File(['image'], 'profile.png', { type: 'image/png' })] },
    })
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'blob:test-profile')
  })

  it('지원하지 않는 형식은 거부한다', () => {
    render(<PickerHarness />)
    fireEvent.change(screen.getByLabelText('프로필 사진', { selector: 'input' }), {
      target: { files: [new File(['text'], 'profile.txt', { type: 'text/plain' })] },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('JPG·PNG·WebP')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
