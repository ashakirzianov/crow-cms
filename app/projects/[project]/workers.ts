'use server'

import { AssetMetadataUpdate, sortAssets } from "@/shared/assets"
import { applyMetadataUpdates, getAllAssetMetadata } from "@/shared/metadataStore"
import { requestVariants } from "@/shared/fileStore"
import { makeBatches } from "@/shared/utils"
import { DEFAULT_VARIANT_SPECS, variantFileName } from "@/shared/variants"

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