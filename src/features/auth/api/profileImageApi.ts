import { usesAuthMocks } from '@/features/auth/lib/authMode'
import type { ImageUploadResultResponse, ImageUploadUrlResponse } from '@/features/listings/model/types'
import { apiRequest } from '@/shared/api/http'

/** S3 presigned PUT은 API 서버 인증 헤더를 보내지 않는다. */
export async function uploadProfileImage(file: File): Promise<number> {
  if (usesAuthMocks) throw new Error('목 화면에서는 이미지 저장을 지원하지 않습니다.')
  const allocation = await apiRequest<ImageUploadUrlResponse>('/images/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      purpose: 'PROFILE',
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  })
  try {
    const upload = await fetch(allocation.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!upload.ok) throw new Error('프로필 이미지 업로드에 실패했습니다.')
    const verified = await apiRequest<ImageUploadResultResponse>(
      `/images/${allocation.imageId}/complete`,
      { method: 'POST' },
    )
    if (verified.status !== 'VERIFIED') throw new Error('선택한 이미지가 검증을 통과하지 못했습니다.')
    return verified.imageId
  } catch (error) {
    await apiRequest<void>(`/images/${allocation.imageId}`, { method: 'DELETE' }).catch(() => {})
    throw error
  }
}

export async function deleteProfileUpload(imageId: number): Promise<void> {
  if (usesAuthMocks) return
  await apiRequest<void>(`/images/${imageId}`, { method: 'DELETE' })
}
