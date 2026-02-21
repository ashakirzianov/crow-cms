'use server'

import { AssetMetadata, AssetMetadataUpdate, sortAssets, toSafeId } from "@/shared/assets"
import { applyMetadataUpdates, changeAssetId, loadAllAssetMetadata, getAssetIds } from "@/shared/metadataStore"
import { requestVariants } from "@/shared/fileStore"
import { makeBatches } from "@/shared/utils"
import { DEFAULT_VARIANT_SPECS, variantFileName } from "@/shared/variants"
import { Result } from "@/shared/result"

export async function prettifyId({ project, asset }: {
    project: string,
    asset: AssetMetadata,
}): Promise<Result<{ newAssetId: string }>> {
    if (!asset.title) {
        console.error(`Asset "${JSON.stringify(asset)}" has no title. Cannot generate ID.`)
        return { success: false, message: 'Asset has no title to generate ID from' }
    }
    const baseId = toSafeId(asset.title)
    if (!baseId) {
        console.error(`Failed to generate a valid ID from asset title "${asset.title}". Generated base ID is empty.`)
        return { success: false, message: 'Could not generate a valid ID from the asset title' }
    }

    if (baseId === asset.id) {
        return { success: true, message: 'ID is already prettified', newAssetId: asset.id }
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
    if (changeResult.success) {
        console.info(`Changed asset ID from "${asset.id}" to "${newAssetId}"`)
        return { success: true, newAssetId }
    } else {
        console.error(`Failed to change asset ID from "${asset.id}" to "${newAssetId}": ${changeResult.message}`)
        return { success: false, message: `Failed to change asset ID: ${changeResult.message}` }
    }
}

export async function prettifyAllIds({ project }: { project: string }) {
    const allAssets = await loadAllAssetMetadata({ project })
    let changed = 0
    let unchanged = 0
    const failureMessages: string[] = []

    for (const asset of allAssets) {
        const result = await prettifyId({ project, asset })
        if (!result.success) {
            console.error(`Failed to prettify ID for asset "${asset.id}": ${result.message}`)
            failureMessages.push(`Asset "${asset.id}": ${result.message}`)
        } else if (result.newAssetId === asset.id) {
            unchanged++
        } else {
            changed++
        }
    }

    return {
        success: failureMessages.length === 0,
        payload: { changed, unchanged, failed: failureMessages.length, failureMessages },
    }
}

export async function replaceTag({ project, toReplace, replaceWith }: {
    project: string,
    toReplace: string,
    replaceWith: string,
}) {
    const allAssets = await loadAllAssetMetadata({ project })
    const updates: AssetMetadataUpdate[] = []

    for (const asset of allAssets) {
        if (asset.tags?.includes(toReplace)) {
            updates.push({
                id: asset.id,
                tags: asset.tags.map(tag => tag === toReplace ? replaceWith : tag),
            })
        }
    }

    if (updates.length === 0) {
        return { success: true, payload: { replaced: 0 } }
    }

    const result = await applyMetadataUpdates({ project, updates })
    return {
        success: result.success,
        payload: { replaced: updates.length },
    }
}

export async function replaceAllValues({ project, property, toReplace, replaceWith }: {
    project: string,
    property: Exclude<keyof AssetMetadataUpdate, 'id'>,
    toReplace: unknown,
    replaceWith: unknown,
}) {
    const allAssets = await loadAllAssetMetadata({ project })
    const updates: AssetMetadataUpdate[] = []

    for (const asset of allAssets) {
        if (asset[property] === toReplace) {
            updates.push({ id: asset.id, [property]: replaceWith })
        }
    }

    if (updates.length === 0) {
        return { success: true, payload: { replaced: 0 } }
    }

    const result = await applyMetadataUpdates({ project, updates })
    return {
        success: result.success,
        payload: { replaced: updates.length },
    }
}

export async function normalizeOrder({ project }: { project: string }) {
    const allAssets = await loadAllAssetMetadata({ project })
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
    const allAssets = await loadAllAssetMetadata({ project })
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