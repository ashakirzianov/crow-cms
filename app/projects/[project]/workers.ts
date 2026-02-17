'use server'

import { AssetMetadataUpdate, sortAssets } from "@/shared/assets"
import { applyMetadataUpdates, getAllAssetMetadata } from "@/shared/metadataStore"

export async function normalizeOrder({ project }: { project: string }) {
    const allAssets = await getAllAssetMetadata({ project, force: true })
    const sorted = sortAssets(allAssets)
    const updates: AssetMetadataUpdate[] = sorted.map((asset, index) => {
        return {
            id: asset.id,
            order: index + 1,
        }
    })
    const result = await applyMetadataUpdates({ project, updates })
    return result
}