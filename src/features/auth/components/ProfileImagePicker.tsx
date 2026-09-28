import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ProfileImagePickerProps {
  label: string
  value?: File | null
  currentUrl?: string | null
  onChange?: (file: File | null) => void
  disabled?: boolean
}

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maximumBytes = 10 * 1024 * 1024

/** 가입 화면에서는 미리 보기만 하고, 가입 후 인증된 상태에서 실제 업로드한다. */
export function ProfileImagePicker({
  label,
  value,
  currentUrl,
  onChange,
  disabled = false,
}: ProfileImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<{ file: File; url: string } | null>(null)
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    }
  }, [])

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!supportedTypes.has(file.type) || file.size > maximumBytes || file.size === 0) {
      setError('JPG·PNG·WebP 이미지만 10MB 이하로 선택해 주세요.')
      onChange?.(null)
      return
    }
    setError(null)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    const next = { file, url: URL.createObjectURL(file) }
    previewRef.current = next
    setPreview(next)
    onChange?.(file)
  }

  const previewUrl = value && preview?.file === value ? preview.url : null

  return (
    <div className="profile-picker">
      <button
        className="profile-picker__button"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={label}
      >
        {previewUrl || currentUrl ? (
          <img src={previewUrl ?? currentUrl ?? undefined} alt="" />
        ) : (
          <Plus size={22} aria-hidden="true" />
        )}
      </button>
      <span>{label}</span>
      {error ? <span className="field-error" role="alert">{error}</span> : null}
      <input
        ref={inputRef}
        className="sr-only"
        aria-label={label}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
