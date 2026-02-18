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
    return {
        success: result,
        payload: {
            count: updates.length,
        },
    }
}

export async function generateDefaultVariants({ project }: { project: string }) {
    const allAssets = await getAllAssetMetadata({ project, force: true })
    console.info(`Generating variants for ${allAssets.length} assets in project "${project}"`)
    let failures = 0
    for (const asset of allAssets) {
        const result = await requestVariant({ fileName: asset.fileName, project })
        if (!result.success) {
            console.error(`Failed to generate variant for asset "${asset.id}": ${result.message}`)
            failures++
        } else if (result.message) {
            console.info(`Variant for "${asset.id}" succeded with message: ${result.message}`)
        }
    }
    console.info(`Finished generating variants for project "${project}". ${failures} out of ${allAssets.length} assets failed.`)
    return {
        success: failures === 0,
        payload: { failed: failures, total: allAssets.length },
    }
}