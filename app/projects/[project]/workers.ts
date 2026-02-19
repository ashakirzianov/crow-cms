'use server'

import { AssetMetadata, AssetMetadataUpdate, sortAssets, toSafeId } from "@/shared/assets"
import { applyMetadataUpdates, changeAssetId, getAllAssetMetadata, getAssetIds } from "@/shared/metadataStore"
import { requestVariants } from "@/shared/fileStore"
import { makeBatches } from "@/shared/utils"
import { DEFAULT_VARIANT_SPECS, variantFileName } from "@/shared/variants"
import { Result } from "@/shared/result"

export async function prettifyId({ project, asset }: {
    project: string,
    asset: AssetMetadata,
}): Promise<Result<{ newAssetId: string }>> {
    if (!asset.title) {
        return { success: false, message: 'Asset has no title to generate ID from' }
    }
    const baseId = toSafeId(asset.title)
    if (!baseId) {
        return { success: false, message: 'Could not generate a valid ID from the asset title' }
    }

    const existingIds = new Set(await getAssetIds({ project }))

    let newAssetId = baseId
    let suffix = 2
    while (existingIds.has(newAssetId) && newAssetId !== asset.id) {
        newAssetId = `${baseId}-${suffix}`
        suffix++
    }

    if (newAssetId === asset.id) {
        return { success: true, newAssetId }
    }

    const changeResult = await changeAssetId({ assetId: asset.id, newAssetId, project })
    return changeResult.success
        ? { success: true, newAssetId }
        : { success: false, message: `Failed to change asset ID: ${changeResult.message}` }
}

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
        success: result.success,
        payload: {
            count: updates.length,
        },
    }
}

const PARALLEL_ASSET_LIMIT = 5

export async function generateDefaultVariants({ project }: { project: string }) {
    const allAssets = await getAllAssetMetadata({ project, force: true })
    console.info(`Generating variants for ${allAssets.length} assets in project "${project}"`)

    let failures = 0

    // Process assets in parallel batches; each asset downloads its original once
    const batches = makeBatches(allAssets, PARALLEL_ASSET_LIMIT)
    for (const batch of batches) {
        const batchResults = await Promise.all(
            batch.map(asset =>
                requestVariants({
                    fileName: asset.fileName,
                    project,
                    variants: DEFAULT_VARIANT_SPECS,
                })
            )
        )
        for (let inBatchIdx = 0; inBatchIdx < batchResults.length; inBatchIdx++) {
            const variantResults = batchResults[inBatchIdx]
            const asset = batch[inBatchIdx]
            for (let inVariantsIdx = 0; inVariantsIdx < variantResults.length; inVariantsIdx++) {
                const result = variantResults[inVariantsIdx]
                if (!result.success) {
                    const variant = DEFAULT_VARIANT_SPECS[inVariantsIdx]
                    const variantFile = variantFileName({
                        originalName: asset.fileName,
                        variant,
                    })
                    console.error(`Failed to generate variant "${variantFile}: ${result.message}`)
                    failures++
                }
            }
        }
    }

    const total = allAssets.length * DEFAULT_VARIANT_SPECS.length
    console.info(`Finished generating variants for project "${project}". ${failures} out of ${total} jobs failed.`)
    return {
        success: failures === 0,
        payload: { failed: failures, total },
    }
}