import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const S3_CONFIG = {
    AWS_REGION: 'us-east-2',
    BUCKET_NAME: 'crow-cms',
}

export async function existsInStorage({ key }: { key: string }): Promise<boolean> {
    const s3Client = getS3Client()
    if (!s3Client) return false

    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: key,
        }))
        return true
    } catch {
        return false
    }
}

export async function downloadFromStorage({ key }: { key: string }): Promise<Buffer | undefined> {
    const s3Client = getS3Client()
    if (!s3Client) return undefined

    const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
    })
    const response = await s3Client.send(command)
    if (!response.Body) return undefined

    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
}

/**
 * Core utility for uploading a buffer to an S3 bucket
 */
export async function uploadToStorage({
    key,
    buffer,
    contentType,
    cacheControl = 'max-age=31536000', // 1 year caching by default
}: {
    key: string;
    buffer: Buffer;
    contentType: string;
    cacheControl?: string;
}): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        const s3Client = getS3Client()
        if (!s3Client) {
            return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }
        }

        // Create upload command
        const command = new PutObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: cacheControl,
        })

        // Execute upload
        await s3Client.send(command)

        return {
            success: true,
            message: 'File uploaded successfully to S3'
        }
    } catch (error) {
        console.error('Error in uploadToStorage:', error)
        return {
            success: false,
            message: error instanceof Error ? `S3 upload error: ${error.message}` : 'Unknown S3 error'
        }
    }
}

/**
 * Creates and returns an S3 client if AWS credentials are available
 */
function getS3Client() {
    // Check if AWS credentials environment variables are set
    if (!process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY) {
        console.warn('AWS credentials not found. File will not be uploaded to S3.')
        // Return undefined for development purposes
        return undefined
    }

    // Create S3 client
    return new S3Client({
        region: S3_CONFIG.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    })
}