'use server'
import { AssetMetadata, AssetMetadataUpdate, AssetKind, parseTagsString } from "@/shared/assets"
import { applyMetadataUpdates, deleteAssetMetadata, getAssetMetadata, storeAssets } from "@/shared/metadataStore"
import { isAuthorized } from "@/shared/auth"
import { parseAssetCreates, parseAssetUpdates } from "@/app/projects/[project]/common"
import { deleteAssetFiles } from "@/shared/fileStore"

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

        // Prepare update data
        const update: AssetMetadataUpdate = {
            id: id,
            title: (formData.get('title') as string | null)?.trim() || undefined,
            year: formData.get('year') ? Number(formData.get('year')) : undefined,
            material: (formData.get('material') as string | null)?.trim() || undefined,
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

        const [metadataResult] = await Promise.all([
            deleteAssetMetadata({ id, project }),
            deleteAssetFiles({ fileName: asset.fileName, project }),
        ])

        return {
            success: metadataResult,
            message: metadataResult ? 'Asset deleted successfully' : 'Failed to delete asset'
        }
    } catch (error) {
        console.error('Error deleting asset:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}


export type HandleJsonEditState = {
    success: boolean,
    message?: string,
    saved?: boolean,
}
export async function handleJsonEdit(_prevState: HandleJsonEditState, formData: FormData): Promise<HandleJsonEditState> {
    const project = formData.get('project') as string
    if (!await isAuthorized(project)) {
        return { success: false, message: 'Unauthorized' }
    }
    const intent = formData.get('intent')
    if (intent === 'create') {
        return await handleJsonCreate(project, formData)
    } else if (intent === 'update') {
        return await handleJsonUpdate(project, formData)
    } else {
        return { success: false, message: 'Invalid intent' }
    }
}

export async function handleJsonCreate(project: string, formData: FormData): Promise<HandleJsonEditState> {
    const json = formData.get('json')
    const parsed = parseAssetCreates(json)
    if (parsed.success) {
        const assets = parsed.data
        const result = await storeAssets({ project, assets })
        console.info('Created assets: ', result)
        return {
            success: true,
            saved: true,
        }
    } else {
        return {
            success: false,
            message: parsed.error.toString(),
        }
    }
}

export async function handleJsonUpdate(project: string, formData: FormData): Promise<HandleJsonEditState> {
    const json = formData.get('json')
    const parsed = parseAssetUpdates(json)
    if (parsed.success) {
        const updates = parsed.data
        const result = await applyMetadataUpdates({ project, updates })
        if (result.success) {
            console.info('Updated assets: ', result.updatedIds)
        }
        return {
            success: true,
            saved: true,
        }
    } else {
        return {
            success: false,
            message: parsed.error.toString(),
        }
    }
}

