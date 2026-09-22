import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * 화면설계서의 "프로필 사진 ＋" 자리.
 *
 * 업로드는 개발자 A의 IMAGES API(업로드 URL 발급 → 완료)가 필요해서 아직 연결하지 않았다.
 * 지금은 고른 이미지를 브라우저에서 미리 보여주기만 한다.
 */
export function ProfileImagePicker({ label }: { label: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const pick = (file: File | undefined) => {
    if (!file) return
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  return (
    <div className="profile-picker">
      <button
        className="profile-picker__button"
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={label}
      >
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <Plus size={22} aria-hidden="true" />
        )}
      </button>
      <span>{label}</span>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        tabIndex={-1}
        onChange={(event) => pick(event.target.files?.[0])}
      />
    </div>
  )
}
