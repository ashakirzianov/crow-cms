import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { generateAssetId, splitFileNameAndExtension, AssetMetadata } from './assets'
import { getAssetNames, storeAsset } from './metadataStore'
import { processImage } from './images'

const UNPUBLISHED_KIND = 'unpublished'

const S3_CONFIG = {
    AWS_REGION: 'us-east-2',
    BUCKET_NAME: 'crow-cms',
}

export type UploadProgress = {
    fileName: string
    progress: number // 0 to 100
    status: 'pending' | 'uploading' | 'success' | 'error'
    error?: string
}

export type ProcessedImage = {
    buffer: Buffer
    width: number
    height: number
    format: string
    originalName: string
}

/**
 * Uploads a file to S3 and returns the result with URL
 * Uses a three-stage process:
 * 1. Process and resize image if needed
 * 2. Generate unique asset ID and upload to S3
 * 3. Create metadata record
 */
export async function uploadAssetFile({ file, project }: { file: File, project: string }): Promise<{
    success: boolean;
    message: string;
    fileName?: string;
    url?: string;
    assetId?: string;
}> {
    try {
        // STAGE 1: Process the image
        const processResult = await processImage(file)
        if (!processResult.success || !processResult.image) {
            return processResult
        }

        const { image } = processResult

        // STAGE 2: Generate unique asset ID and upload to S3
        const uploadResult = await uploadImageToS3WithUniqueId({ image, project })
        if (!uploadResult.success || !uploadResult.fileName || !uploadResult.assetId) {
            console.error('Upload failed:', uploadResult)
            return uploadResult
        }

        const { fileName, assetId } = uploadResult

        // STAGE 3: Create metadata record
        const metadataResult = await createAssetMetadata({
            project,
            asset: {
                id: assetId,
                fileName,
                width: image.width,
                height: image.height,
                uploaded: Date.now(),
                kind: UNPUBLISHED_KIND,
            },
        })

        if (!metadataResult.success) {
            return {
                success: false,
                message: `File uploaded to S3, but metadata creation failed: ${metadataResult.message}`,
                fileName,
                assetId
            }
        }

        // Return success with all details
        return {
            success: true,
            message: 'Asset uploaded and metadata created successfully',
            fileName,
            assetId
        }
    } catch (error) {
        console.error('Error in uploadAssetFile:', error)
        return {
            success: false,
            message: error instanceof Error ? `Upload error: ${error.message}` : 'Unknown upload error'
        }
    }
}

export async function downloadOriginalFromS3({ assetId, project }: { assetId: string, project: string }): Promise<Buffer | undefined> {
    const s3Client = getS3Client()
    if (!s3Client) return undefined

    const key = fullKeyForOriginal({ assetId, project })
    const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
    })
    const response = await s3Client.send(command)
    if (!response.Body) return undefined

    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
}

export async function uploadVariantToS3({ buffer, name, project }: {
    buffer: Buffer
    name: string
    project: string
}): Promise<{ success: boolean; message: string; key?: string }> {
    const s3Client = getS3Client()
    if (!s3Client) {
        return { success: false, message: 'S3 client not initialized. Check AWS credentials.' }
    }

    const key = fullKeyForVariant({ name, project })
    const result = await uploadToS3Bucket({
        s3Client,
        bucketName: S3_CONFIG.BUCKET_NAME,
        key,
        buffer,
        contentType: 'image/webp',
    })

    if (!result.success) return result
    return { success: true, message: 'Variant uploaded', key }
}

/**
 * Stage 2: Generate unique asset ID and upload to S3
 */
async function uploadImageToS3WithUniqueId({ image, project }: { image: ProcessedImage, project: string }): Promise<{
    success: boolean;
    message: string;
    fileName?: string;
    assetId?: string;
}> {
    try {
        // Create S3 client
        const s3Client = getS3Client()
        if (!s3Client) {
            return {
                success: false,
                message: 'S3 client not initialized. Check AWS credentials.'
            }
        }

        // Get existing asset IDs to check for uniqueness
        const existingAssetNames = await getAssetNames({ project })
        const existingAssetIds = new Set(existingAssetNames)

        const [baseFileName, fileExtension] = splitFileNameAndExtension(image.originalName)


        // Generate base asset ID from file name
        let fileName = image.originalName
        let assetId = generateAssetId(baseFileName)

        // Ensure unique asset ID by adding numeric suffix if needed
        let suffix = 1

        while (existingAssetIds.has(assetId)) {
            fileName = `${baseFileName}-${suffix}.${fileExtension}`
            assetId = generateAssetId(fileName)
            suffix++
        }

        // Generate the file name with extension
        const key = fullKeyForOriginal({
            assetId,
            project,
        })

        // Upload to S3 bucket
        const result = await uploadToS3Bucket({
            s3Client,
            bucketName: S3_CONFIG.BUCKET_NAME,
            key,
            buffer: image.buffer,
            contentType: `image/${image.format}`,
        })

        if (!result.success) {
            return result
        }


        return {
            success: true,
            message: 'File uploaded successfully to S3',
            fileName: key,
            assetId,
        }
    } catch (error) {
        console.error('Error uploading to S3:', error)
        return {
            success: false,
            message: error instanceof Error ? `S3 upload error: ${error.message}` : 'Unknown S3 error'
        }
    }
}

/**
 * Stage 3: Create metadata record for the uploaded asset
 */
async function createAssetMetadata({ asset, project }: { asset: AssetMetadata, project: string }): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        await storeAsset({ asset, project })
        return {
            success: true,
            message: 'Asset metadata created successfully'
        }
    } catch (error) {
        console.error('Error creating asset metadata:', error)
        return {
            success: false,
            message: error instanceof Error
                ? `Metadata creation error: ${error.message}`
                : 'Unknown metadata creation error'
        }
    }
}

/**
 * Core utility for uploading a buffer to an S3 bucket
 */
async function uploadToS3Bucket({
    s3Client,
    bucketName,
    key,
    buffer,
    contentType,
    cacheControl = 'max-age=31536000', // 1 year caching by default
}: {
    s3Client: S3Client;
    bucketName: string;
    key: string;
    buffer: Buffer;
    contentType: string;
    cacheControl?: string;
}): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        // Create upload command
        const command = new PutObjectCommand({
            Bucket: bucketName,
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
        console.error('Error in uploadToS3Bucket:', error)
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

function fullKeyForOriginal({
    assetId,
    project,
}: {
    assetId: string
    project: string
}) {
    return `${project}/originals/${assetId}`
}

function fullKeyForVariant({
    name,
    project,
}: {
    name: string
    project: string
}) {
    return `${project}/variants/${name}`
}