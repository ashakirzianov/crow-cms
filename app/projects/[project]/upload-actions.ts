'use server'
import { isAuthorized } from '@/shared/auth'
import { generateUploadTarget, confirmUploadedAsset } from '@/shared/fileStore'

export async function getPresignedUpload({
    project, fileName, contentType,
}: {
    project: string,
    fileName: string,
    contentType: string,
}): Promise<{ presignedUrl: string, fileName: string }> {
    if (!await isAuthorized(project)) {
        throw new Error('Unauthorized')
    }
    if (!contentType.startsWith('image/')) {
        throw new Error('Only image files are supported')
    }
    const result = await generateUploadTarget({ project, fileName, contentType })
    if (!result.success) {
        throw new Error(result.message)
    }
    return { presignedUrl: result.presignedUrl, fileName: result.fileName }
}

export async function confirmUpload({
    project, fileName,
}: {
    project: string,
    fileName: string,
}): Promise<{ assetId: string }> {
    if (!await isAuthorized(project)) {
        throw new Error('Unauthorized')
    }
    const result = await confirmUploadedAsset({ project, fileName })
    if (!result.success) {
        throw new Error(result.message)
    }
    return { assetId: result.assetId }
}
