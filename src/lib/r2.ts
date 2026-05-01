import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

function generateKey(userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `uploads/${userId}/${timestamp}-${random}.png`
}

export async function uploadImage(
  imageData: Buffer | Uint8Array,
  userId: string,
  contentType: string = 'image/png'
): Promise<string> {
  const key = generateKey(userId)
  const bucketName = process.env.R2_BUCKET_NAME!

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageData,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })

  await r2Client.send(command)

  return `${process.env.R2_PUBLIC_URL}/${key}`
}

export async function deleteImage(imageUrl: string): Promise<void> {
  // 从完整 URL 中提取 key
  const publicUrl = process.env.R2_PUBLIC_URL!
  const key = imageUrl.replace(`${publicUrl}/`, '')

  if (!key) return

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })

  await r2Client.send(command)
}