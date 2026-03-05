import { AssetMetadata, AssetMetadataUpdate } from './assets'
import { applyMetadataUpdates, deleteAssetMetadata, getAssetMetadata, storeAssets } from './metadataStore'
import { deleteAssetFiles } from './fileStore'
import { Result } from './result'

export async function updateAsset({ project, update }: {
    project: string
    update: AssetMetadataUpdate
}): Promise<Result<{ asset: AssetMetadata | null }>> {
    await applyMetadataUpdates({ project, updates: [update] })
    const asset = await getAssetMetadata({ id: update.id, project })
    return { success: true, asset: asset ?? null }
}

export async function deleteAsset({ project, id }: {
    project: string
    id: string
}): Promise<Result> {
    const asset = await getAssetMetadata({ id, project })
    if (!asset) {
        return { success: false, message: `Asset with ID "${id}" not found` }
    }
    const [metadataDeleted] = await Promise.all([
        deleteAssetMetadata({ id, project }),
        deleteAssetFiles({ fileName: asset.fileName, project }),
    ])
    return {
        success: metadataDeleted,
        message: metadataDeleted ? 'Asset deleted successfully' : 'Failed to delete asset',
    }
}

export async function createAssets({ project, assets }: {
    project: string
    assets: AssetMetadata[]
}): Promise<Result> {
    await storeAssets({ project, assets })
    return { success: true }
}

export async function batchUpdateAssets({ project, updates }: {
    project: string
    updates: AssetMetadataUpdate[]
}): Promise<Result> {
    return applyMetadataUpdates({ project, updates })
}
