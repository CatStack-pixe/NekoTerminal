'use client'

import { useState, useCallback } from 'react'

export function useImageUpload() {
  const [uploadingImage, setUploadingImage] = useState(false)

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody || `Upload failed: ${response.status}`)
      }

      const { url } = await response.json()
      return url as string
    } catch (error) {
      console.error('Image upload failed:', error)
      return null
    } finally {
      setUploadingImage(false)
    }
  }, [])

  return {
    uploadImage,
    uploadingImage,
  }
}