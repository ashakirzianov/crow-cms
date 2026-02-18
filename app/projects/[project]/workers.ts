'use server'

import { AssetMetadataUpdate, sortAssets } from "@/shared/assets"
import { applyMetadataUpdates, getAllAssetMetadata } from "@/shared/metadataStore"
import { requestVariant } from "@/shared/fileStore"

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

export async function generateDefaultVariants({ project }: { project: string }) {
    const allAssets = await getAllAssetMetadata({ project, force: true })
    let allSucceeded = true
    for (const asset of allAssets) {
        const result = await requestVariant({ fileName: asset.fileName, project })
        if (!result.success) {
            console.error(`Failed to generate variant for asset "${asset.id}": ${result.message}`)
            allSucceeded = false
        }
    }
    return allSucceeded
}