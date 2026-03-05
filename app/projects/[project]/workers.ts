'use server'

import { AssetMetadata, AssetMetadataUpdate, sortAssets, toSafeId } from "@/shared/assets"
import { applyMetadataUpdates, changeAssetId, loadAllAssetMetadata, getAssetIds } from "@/shared/metadataStore"
import { requestVariants, deleteAssetFiles, confirmUploadedAsset } from "@/shared/fileStore"
import { listKeysWithPrefix, listObjectsWithEtags } from "@/shared/blobStore"
import { makeBatches } from "@/shared/utils"
import { DEFAULT_VARIANT_SPECS, variantFileName } from "@/shared/variants"
import { Result } from "@/shared/result"
import { redirect } from "next/navigation"
import { hrefForConsole } from "@/shared/href"

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

export type DuplicateFile = { fileName: string, assetId?: string }

export async function findDuplicateOriginals({ project, fileName }: { project: string, fileName: string }) {
    const prefix = `${project}/originals/`
    const [listResult, allAssets] = await Promise.all([
        listObjectsWithEtags({ prefix }),
        loadAllAssetMetadata({ project }),
    ])

    if (!listResult.success) {
        return { success: false, payload: { duplicates: [] as DuplicateFile[] } }
    }

    const targetKey = `${prefix}${fileName}`
    const target = listResult.objects.find(o => o.key === targetKey)
    if (!target) {
        return { success: false, payload: { duplicates: [] as DuplicateFile[], message: 'File not found in storage' } }
    }

    const fileNameToAssetId = new Map(allAssets.map(a => [a.fileName, a.id]))

    const duplicates = listResult.objects
        .filter(o => o.key !== targetKey && o.etag === target.etag)
        .map(o => {
            const dupFileName = o.key.slice(prefix.length)
            return { fileName: dupFileName, assetId: fileNameToAssetId.get(dupFileName) }
        })

    return { success: true, payload: { duplicates } }
}

export async function createAssetFromOrphan({ project, fileName }: { project: string, fileName: string }) {
    const result = await confirmUploadedAsset({ project, fileName })
    if (!result.success) {
        return result
    }
    redirect(hrefForConsole({ project, assetId: result.assetId }))
}

export async function deleteOrphan({ project, fileName }: { project: string, fileName: string }) {
    await deleteAssetFiles({ fileName, project })
    redirect(hrefForConsole({ project, action: 'orphans' }))
}

export async function findOrphanedVariants({ project }: { project: string }) {
    const originalsPrefix = `${project}/originals/`
    const variantsPrefix = `${project}/variants/`

    const [originalsResult, variantsResult] = await Promise.all([
        listKeysWithPrefix({ prefix: originalsPrefix }),
        listKeysWithPrefix({ prefix: variantsPrefix }),
    ])

    if (!originalsResult.success) {
        return { success: false, payload: { orphans: [] as string[] } }
    }
    if (!variantsResult.success) {
        return { success: false, payload: { orphans: [] as string[] } }
    }

    const originalFileNames = new Set(
        originalsResult.keys.map(key => key.slice(originalsPrefix.length))
    )

    const orphans = variantsResult.keys
        .map(key => key.slice(variantsPrefix.length))
        .filter(variantName => {
            const lastAt = variantName.lastIndexOf('@')
            const originalName = lastAt !== -1 ? variantName.substring(0, lastAt) : variantName
            return !originalFileNames.has(originalName)
        })

    return { success: true, payload: { orphans } }
}

export async function findOrphanedOriginals({ project }: { project: string }) {
    const prefix = `${project}/originals/`
    const [listResult, allAssets] = await Promise.all([
        listKeysWithPrefix({ prefix }),
        loadAllAssetMetadata({ project }),
    ])

    if (!listResult.success) {
        return { success: false, payload: { orphans: [] as string[], message: listResult.message } }
    }

    const assetFileNames = new Set(allAssets.map(a => a.fileName))
    const orphans = listResult.keys
        .map(key => key.slice(prefix.length))
        .filter(fileName => !assetFileNames.has(fileName))

    return { success: true, payload: { orphans } }
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