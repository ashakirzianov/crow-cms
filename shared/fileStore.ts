import { AssetMetadata, generateAssetId, splitFileNameAndExtension } from './assets'
import { getAssetIds, storeAsset, acquireVariantLock, releaseVariantLock, isVariantLocked } from './metadataStore'
import { processImageFile, createImageVariant, ProcessedImage } from './images'
import { uploadToStorage, downloadFromStorage, existsInStorage } from './blobStore'
import { Result } from './result'
import { DEFAULT_VARIANT_SPECS, variantFileName, VariantSpec } from './variants'
import { lazy, Lazy } from './utils'

const UNPUBLISHED_KIND = 'unpublished'
export const VARIANT_LOCKED_MESSAGE = 'Variant is currently being generated'
export const VARIANT_ALREADY_EXISTS_MESSAGE = 'Variant already exists'

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
export async function uploadAssetFile({ file, project }: { file: File, project: string }): Promise<Result<{
    fileName: string;
    assetId: string;
}>> {
    try {
        // STAGE 1: Process the image
        const processResult = await processImageFile(file)
        if (!processResult.success) {
            return processResult
        }

        const { image } = processResult

        // STAGE 2: Generate unique asset ID and upload to S3
        const uploadResult = await uploadOriginalImageToS3WithUniqueId({ image, project })
        if (!uploadResult.success) {
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
            }
        }

        let message = 'Asset uploaded and metadata created successfully'

        // STAGE 4: Generate and upload default variant

        const variantResult = await uploadDefaultVariants({ buffer: image.buffer, originalName: fileName, project })
        if (!variantResult.success) {
            console.error('Variant generation/upload failed:', variantResult)
            // Not critical enough to fail the whole upload, so we log the error but continue
            message += `. However, some variant generation/upload failed: ${variantResult.message}`
        }

        // Return success with all details
        return {
            success: true,
            message,
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

async function uploadDefaultVariants({ buffer, originalName, project }: { buffer: Buffer, originalName: string, project: string }): Promise<Result> {
    const promises = DEFAULT_VARIANT_SPECS.map(variant =>
        generateAndUploadVariant({ buffer, originalName, project, variant })
    )
    const variantResults = await Promise.allSettled(promises)
    const allResults = variantResults.map((result) => {
        if (result.status === 'fulfilled') {
            return result.value
        } else {
            return { success: false, message: `Variant generation/upload failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}` }
        }
    })
    const failures = allResults.filter(r => !r.success)
    if (failures.length > 0) {
        const message = failures.map(f => f.message).join('; ')
        return {
            success: false,
            message,
        }
    }
    return {
        success: true,
    }
}

export async function requestVariants({
    fileName, project, variants,
}: {
    fileName: string
    project: string
    variants: VariantSpec[]
}) {
    const originalLazy = lazy(
        () => downloadFromStorage({
            key: fullKeyForOriginal({ fileName, project })
        })
    )
    const promises = variants.map(variant => requestVariantImpl({ fileName, project, variant, originalLazy }))
    return Promise.all(promises)
}

async function requestVariantImpl({
    fileName, project, variant, originalLazy,
}: {
    fileName: string
    project: string
    variant: VariantSpec
    originalLazy: Lazy<Promise<Result<{ buffer: Buffer }>>>
}): Promise<Result<{
    key: string,
    buffer: Buffer | undefined,
}>> {
    const variantName = variantFileName({ originalName: fileName, variant })
    const variantKey = fullKeyForVariant({ fileName: variantName, project })

    if (await existsInStorage({ key: variantKey })) {
        return {
            success: true,
            message: VARIANT_ALREADY_EXISTS_MESSAGE,
            key: variantKey,
            buffer: undefined, // Caller can choose to download if needed
        }
    }

    if (await isVariantLocked({ variantKey })) {
        return { success: false, message: VARIANT_LOCKED_MESSAGE }
    }

    if (!await acquireVariantLock({ variantKey })) {
        return { success: false, message: VARIANT_LOCKED_MESSAGE }
    }

    try {
        const downloadResult = await originalLazy()
        if (!downloadResult.success) {
            return { success: false, message: 'Original file not found in storage' }
        }

        return await generateAndUploadVariant({ buffer: downloadResult.buffer, originalName: fileName, project, variant })
    } finally {
        await releaseVariantLock({ variantKey })
    }
}

async function generateAndUploadVariant({ buffer, originalName, project, variant }: {
    buffer: Buffer
    originalName: string
    project: string
    variant: VariantSpec
}): Promise<Result<{
    key: string
    buffer: Buffer
}>> {
    const result = await createImageVariant({ buffer, originalName, variant })
    if (!result.success) {
        return result
    }

    const upload = await uploadVariantToStorage({
        image: result.image,
        project,
    })
    if (!upload.success) return upload
    return {
        success: true,
        key: upload.key,
        buffer: result.image.buffer,
    } as const
}

/**
 * Stage 2: Generate unique asset ID and upload to S3
 */
async function uploadOriginalImageToS3WithUniqueId({ image, project }: { image: ProcessedImage, project: string }): Promise<Result<{
    fileName: string;
    assetId: string;
}>> {
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

async function uploadOriginalToStorage({ image, project }: { image: ProcessedImage, project: string }): Promise<Result<{
    key: string;
}>> {
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

async function uploadVariantToStorage({ image, project }: { image: ProcessedImage, project: string }): Promise<Result<{
    key: string;
}>> {
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