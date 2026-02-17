'use server'

import { AssetMetadataUpdate, sortAssets } from "@/shared/assets"
import { applyMetadataUpdates, getAllAssetMetadata } from "@/shared/metadataStore"

export async function normalizeOrder() {
    const allAssets = await getAllAssetMetadata(true)
    const sorted = sortAssets(allAssets)
    const updates: AssetMetadataUpdate[] = sorted.map((asset, index) => {
        return {
            id: asset.id,
            order: index + 1,
        }
    })
    const result = await applyMetadataUpdates(updates)
    return result
}