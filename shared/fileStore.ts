import { AssetMetadata, generateAssetId, splitFileNameAndExtension } from './assets'
import { getAssetIds, storeAsset } from './metadataStore'
import { processImageFile, createImageVariant, ProcessedImage, variantFileName } from './images'
import { uploadToStorage, downloadFromStorage, existsInStorage } from './blobStore'

const UNPUBLISHED_KIND = 'unpublished'

export type UploadProgress = {
    fileName: string
    progress: number // 0 to 100
    status: 'pending' | 'uploading' | 'success' | 'error'
    error?: string
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
        const processResult = await processImageFile(file)
        if (!processResult.success || !processResult.image) {
            return processResult
        }

        const { image } = processResult

        // STAGE 2: Generate unique asset ID and upload to S3
        const uploadResult = await uploadOriginalImageToS3WithUniqueId({ image, project })
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

export async function requestVariant({ fileName, project, width, quality }: {
    fileName: string
    project: string
    width?: number
    quality?: number
}): Promise<{
    success: boolean
    message: string
    key?: string
    buffer?: Buffer
}> {
    const variantName = variantFileName({ originalName: fileName, width, quality })
    const variantKey = fullKeyForVariant({ fileName: variantName, project })

    if (await existsInStorage({ key: variantKey })) {
        return { success: true, message: 'Variant already exists', key: variantKey } as const
    }

    const originalKey = fullKeyForOriginal({ fileName, project })
    const buffer = await downloadFromStorage({ key: originalKey })
    if (!buffer) {
        return { success: false, message: 'Original file not found in storage' } as const
    }

    return generateAndUploadVariant({ buffer, originalName: fileName, project, width, quality })
}

export async function generateAndUploadVariant({ buffer, originalName, project, width, quality }: {
    buffer: Buffer
    originalName: string
    project: string
    width?: number
    quality?: number
}): Promise<{
    success: boolean
    message: string
    key?: string
    buffer?: Buffer
}> {
    const result = await createImageVariant({ buffer, originalName, width, quality })
    if (!result.success || !result.image) {
        return { success: false, message: result.message } as const
    }

    const upload = await uploadVariantToStorage({
        image: result.image,
        project,
    })
    if (!upload.success) return upload
    return {
        success: true,
        message: 'Variant generated and uploaded',
        key: upload.key,
        buffer: result.image.buffer,
    } as const
}

/**
 * Stage 2: Generate unique asset ID and upload to S3
 */
async function uploadOriginalImageToS3WithUniqueId({ image, project }: { image: ProcessedImage, project: string }): Promise<{
    success: boolean;
    message: string;
    fileName?: string;
    assetId?: string;
}> {
    try {
        // Get existing asset IDs to check for uniqueness
        const existingAssetIds = await getAssetIds({ project })
        const existingAssetIdsSet = new Set(existingAssetIds)

        image = { ...image }
        const [baseFileName, fileExtension] = splitFileNameAndExtension(image.fileName)

        // Generate base asset ID from file name
        let assetId = generateAssetId(baseFileName)

        // Ensure unique asset ID by adding numeric suffix if needed
        let suffix = 1

        while (existingAssetIdsSet.has(assetId)) {
            image.fileName = `${baseFileName}-${suffix}.${fileExtension}`
            assetId = generateAssetId(image.fileName)
            suffix++
        }

        // Upload to S3 bucket
        const result = await uploadOriginalToStorage({
            image,
            project,
        })

        if (!result.success) {
            return result
        }


        return {
            success: true,
            message: 'File uploaded successfully to S3',
            fileName: image.fileName,
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

async function uploadOriginalToStorage({ image, project }: { image: ProcessedImage, project: string }): Promise<{
    success: boolean;
    message: string;
    key?: string;
}> {
    const key = fullKeyForOriginal({
        fileName: image.fileName,
        project,
    })

    const result = await uploadToStorage({
        key,
        buffer: image.buffer,
        contentType: image.contentType,
    })

    if (!result.success) {
        return result
    }

    return {
        success: true,
        message: 'File uploaded successfully to S3',
        key,
    }
}

async function uploadVariantToStorage({ image, project }: { image: ProcessedImage, project: string }): Promise<{
    success: boolean;
    message: string;
    key?: string;
}> {
    return uploadToStorage({
        key: fullKeyForVariant({ fileName: image.fileName, project }),
        buffer: image.buffer,
        contentType: image.contentType
    })
}

function fullKeyForOriginal({
    fileName,
    project,
}: {
    fileName: string
    project: string
}) {
    return `${project}/originals/${fileName}`
}

function fullKeyForVariant({
    fileName,
    project,
}: {
    fileName: string
    project: string
}) {
    return `${project}/variants/${fileName}`
}