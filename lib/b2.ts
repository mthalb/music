import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client: S3Client | null = null

function getClient() {
  if (client) return client

  const endpoint = process.env.B2_ENDPOINT
  const region = process.env.B2_REGION
  const accessKeyId = process.env.B2_KEY_ID
  const secretAccessKey = process.env.B2_APPLICATION_KEY

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Backblaze B2 is not configured. Set B2_ENDPOINT, B2_REGION, B2_KEY_ID, and B2_APPLICATION_KEY.'
    )
  }

  client = new S3Client({
    region,
    endpoint: endpoint.startsWith('http')
      ? endpoint
      : `https://${endpoint}`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return client
}

function getBucket() {
  const bucket = process.env.B2_BUCKET_NAME

  if (!bucket) {
    throw new Error(
      'Backblaze B2 bucket is not configured. Set B2_BUCKET_NAME.'
    )
  }

  return bucket
}

export async function getSignedReadUrl(
  key: string,
  ttlMs: number
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  })

  return getSignedUrl(getClient(), command, {
    expiresIn: Math.floor(ttlMs / 1000),
  })
}
