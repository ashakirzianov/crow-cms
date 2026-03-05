import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Result } from './result'

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

export async function downloadFromStorage({ key }: { key: string }): Promise<Result<{ buffer: Buffer }>> {
    const s3Client = getS3Client()
    if (!s3Client) return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }

    const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
    })
    const response = await s3Client.send(command)
    if (!response.Body) return { success: false, message: 'File not found in S3' }

    const bytes = await response.Body.transformToByteArray()
    return { success: true, buffer: Buffer.from(bytes) }
}

export async function deleteFromStorage({ key }: { key: string }): Promise<Result> {
    try {
        const s3Client = getS3Client()
        if (!s3Client) {
            return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }
        }
        await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: key,
        }))
        return { success: true }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? `S3 delete error: ${error.message}` : 'Unknown S3 error',
        }
    }
}

export async function listKeysWithPrefix({ prefix }: { prefix: string }): Promise<Result<{ keys: string[] }>> {
    try {
        const s3Client = getS3Client()
        if (!s3Client) {
            return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }
        }
        const command = new ListObjectsV2Command({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Prefix: prefix,
        })
        const response = await s3Client.send(command)
        const keys = (response.Contents ?? []).map(obj => obj.Key).filter((k): k is string => Boolean(k))
        return { success: true, keys }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? `S3 list error: ${error.message}` : 'Unknown S3 error',
        }
    }
}

/**
 * Generates a presigned URL for direct client-to-S3 upload
 * NOTE: The S3 bucket must have CORS configured to allow PUT from the app's origin
 */
export async function getPresignedUploadUrl({
    key,
    contentType,
    expiresIn = 300,
}: {
    key: string
    contentType: string
    expiresIn?: number
}): Promise<Result<{ url: string }>> {
    try {
        const s3Client = getS3Client()
        if (!s3Client) {
            return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }
        }

        const command = new PutObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: key,
            ContentType: contentType,
            CacheControl: 'max-age=31536000',
        })

        const url = await getSignedUrl(s3Client, command, { expiresIn })
        return { success: true, url }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? `Presign error: ${error.message}` : 'Unknown presign error',
        }
    }
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
}): Promise<Result<{
    key: string;
}>> {
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
            message: 'File uploaded successfully to S3',
            key,
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