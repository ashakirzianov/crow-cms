'use server'
import { AssetMetadata, AssetMetadataUpdate, AssetKind, parseTagsString } from "@/shared/assets"
import { applyMetadataUpdates, deleteAssetMetadata, getAssetMetadata } from "@/shared/metadataStore"
import { isAuthorized } from "@/shared/auth"
import { parseAssetUpdates } from "@/app/projects/[project]/common"
import { uploadAssetFile } from "@/shared/fileStore"
import { revalidatePath } from "next/cache"

export async function updateAsset({
    project, id, formData,
}: {
    project: string,
    id: string,
    formData: FormData,
}): Promise<{ success: boolean, message: string, asset?: AssetMetadata }> {
    try {
        if (!await isAuthorized(project)) {
            return { success: false, message: 'Unauthorized' }
        }
        // Get current asset data
        const asset = await getAssetMetadata({ id, project })
        if (!asset) {
            return { success: false, message: `Asset with ID "${id}" not found` }
        }

        // Prepare update data
        const update: AssetMetadataUpdate = {
            id: id,
            title: formData.get('title') as string || undefined,
            year: formData.get('year') ? Number(formData.get('year')) : undefined,
            material: formData.get('material') as string || undefined,
        }

        // Handle custom kind
        const customKind = formData.get('customKind') as string
        if (customKind && customKind.trim()) {
            update.kind = customKind.trim() as AssetKind
        } else {
            update.kind = formData.get('kind') as AssetKind || undefined
        }

        // Handle order field
        const orderValue = formData.get('order')
        if (orderValue !== null) {
            update.order = orderValue === '' ? undefined : Number(orderValue)
        }

        // Handle tags using the utility function
        const tagsString = formData.get('tags') as string
        update.tags = parseTagsString(tagsString)

        // Apply update
        await applyMetadataUpdates({ project, updates: [update] })

        // Get updated asset
        const updatedAsset = await getAssetMetadata({ id, project })

        // Revalidate the console path to reflect changes
        revalidatePathsForAssets([update])

        return {
            success: true,
            message: 'Asset updated successfully',
            asset: updatedAsset
        }
    } catch (error) {
        console.error('Error updating asset:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}

export async function deleteAsset({
    project, id
}: {
    project: string,
    id: string
}): Promise<{ success: boolean, message: string }> {
    try {
        if (!await isAuthorized(project)) {
            return { success: false, message: 'Unauthorized' }
        }
        // Get current asset data to verify it exists
        const asset = await getAssetMetadata({ id, project })
        if (!asset) {
            return { success: false, message: `Asset with ID "${id}" not found` }
        }

        // Delete the asset from metadata store using the dedicated function
        const result = await deleteAssetMetadata({ id, project })

        // Revalidate the console path to reflect changes
        if (result) {
            revalidatePathsForAssets([asset])
        }

        return {
            success: result,
            message: result ? 'Asset deleted successfully' : 'Failed to delete asset'
        }
    } catch (error) {
        console.error('Error deleting asset:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}

// Server action for uploading files
export async function uploadFile({ project, formData }: { project: string, formData: FormData }): Promise<{
    success: boolean;
    message: string;
    fileName?: string;
    url?: string;
    assetId?: string;
}> {
    try {
        if (!await isAuthorized(project)) {
            return { success: false, message: 'Unauthorized' }
        }
        // Get the file from the form data
        const file = formData.get('file') as File

        if (!file) {
            return { success: false, message: 'No file provided' }
        }

        // Log the file information
        console.info(`Received file upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)

        // Use the enhanced uploadAssetFile function that:
        // 1. Processes the image (validates, resizes if needed)
        // 2. Generates a unique asset ID based on filename
        // 3. Uploads to S3
        // 4. Creates metadata record
        const result = await uploadAssetFile({ file, project })

        // Revalidate the console path to reflect the new asset
        if (result.success && result.assetId) {
            revalidatePathsForAssets([{
                id: result.assetId,
            }])
        }

        return result
    } catch (error) {
        console.error('Error in uploadFile:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}

export type HandleJsonEditState = {
    project: string,
    success: boolean,
    message?: string,
    saved?: boolean,
}
export async function handleJsonEdit({ project }: HandleJsonEditState, formData: FormData): Promise<HandleJsonEditState> {
    if (!await isAuthorized(project)) {
        return { success: false, message: 'Unauthorized', project }
    }
    const json = formData.get('json')
    const parsed = parseAssetUpdates(json)
    if (parsed.success) {
        const updates = parsed.data
        const result = await applyMetadataUpdates({ project, updates })
        console.info('Saved assets: ', result)
        // Revalidate the console path to reflect changes
        revalidatePathsForAssets(updates)
        return {
            success: true,
            saved: true,
            project,
        }
    } else {
        return {
            success: false,
            message: parsed.error.toString(),
            project,
        }
    }
}

function revalidatePathsForAssets(updates: AssetMetadataUpdate[]) {
    const affectedPaths = updates.flatMap((update) => affectedPathsForAsset(update))
    for (const path of affectedPaths) {
        revalidatePath(path)
    }
}

// TODO: rethink this -- affected collections
function affectedPathsForAsset(_asset: AssetMetadataUpdate) {
    return [
        '/',
        '/console',
    ]
}

