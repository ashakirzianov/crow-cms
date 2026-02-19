import { Redis } from '@upstash/redis'
import { AssetMetadata, AssetMetadataUpdate } from './assets'
import { cacheLife, cacheTag } from 'next/cache'
import { revalidateTagsForAssetCreations, revalidateTagsForAssetDeletions, revalidateTagsForAssetUpdates, tagForAssetId, tagForAssetIndex } from '@/app/projects/[project]/cache'
import { Result } from './result'

type AssetMetadataValue = Omit<AssetMetadata, 'id'>

// Initialize Redis
const redis = Redis.fromEnv()

function assetsKey(project: string) {
    return `crow-cms:assets:${project}`
}

export async function getAllAssetMetadata({ project }: {
    project: string,
    force?: boolean,
}) {
    'use cache'
    cacheLife('days')
    cacheTag(tagForAssetIndex(project))
    return loadAllAssetMetadata({ project })
}

export async function getAssetMetadata({ id, project }: { id: string, project: string }) {
    'use cache'
    cacheLife('days')
    cacheTag(tagForAssetId(id, project))
    return loadAssetMetadata({ id, project })
}

export async function getAssetIds({ project }: { project: string }) {
    'use cache'
    cacheLife('days')
    cacheTag(tagForAssetIndex(project))
    return redis.hkeys(assetsKey(project))
}

// Store a single asset
export async function storeAsset({ asset, project }: { asset: AssetMetadata, project: string }): Promise<boolean> {
    if (!asset.fileName) throw new Error('Asset must have a URL')
    const { id, ...metadata } = asset

    await redis.hset(assetsKey(project), {
        [id]: JSON.stringify(metadata),
    })

    revalidateTagsForAssetCreations([asset], project, 'max')

    return true
}

// Store multiple assets
export async function storeAssets({ assets, project }: { assets: AssetMetadata[], project: string }): Promise<boolean> {
    const entries: AssetsRecord = {}

    const creations: AssetMetadata[] = []
    for (const asset of assets) {
        if (!asset.id) {
            continue
        }
        const { id, ...metadata } = asset
        entries[id] = metadata
        creations.push(asset)
    }

    await redis.hset(assetsKey(project), entries)
    revalidateTagsForAssetCreations(creations, project, 'max')

    return true
}

// Delete a single asset
export async function deleteAssetMetadata({ id, project }: { id: string, project: string }): Promise<boolean> {
    const data = await redis.hget<AssetMetadataValue>(assetsKey(project), id)
    if (!data) {
        return false
    }
    const asset: AssetMetadata = { id, ...data }
    await redis.hdel(assetsKey(project), id)
    revalidateTagsForAssetDeletions([asset], project, 'max')
    return true
}

export async function applyMetadataUpdates(
    { project, updates }: { project: string, updates: AssetMetadataUpdate[] }): Promise<Result<{
        updates: Array<{ asset: AssetMetadata, update: AssetMetadataUpdate }>,
    }>> {
    const data = await redis.hgetall<AssetsRecord>(assetsKey(project))
    if (!data) {
        return { success: false, message: 'No assets found' } as const
    }
    const assetStore: AssetsRecord = {}
    const updated: Array<{ asset: AssetMetadata, update: AssetMetadataUpdate }> = []
    for (const update of updates) {
        const { id, ...metadata } = update
        if (data[id]) {
            updated.push({ asset: { id, ...data[id] }, update })
            assetStore[id] = {
                ...data[id],
                ...metadata,
            }
        }
    }

    if (Object.keys(assetStore).length > 0) {
        await redis.hset(assetsKey(project), assetStore)
        revalidateTagsForAssetUpdates(updated, project, 'max')
        return { success: true, updates: updated } as const
    } else {
        return { success: false, message: 'No assets updated' } as const
    }
}

// Variant generation locks

const LOCK_TTL_SECONDS = 60

function variantLockKey(variantKey: string) {
    return `crow-cms:lock:${variantKey}`
}

export async function acquireVariantLock({ variantKey }: { variantKey: string }): Promise<boolean> {
    const result = await redis.set(variantLockKey(variantKey), '1', { nx: true, ex: LOCK_TTL_SECONDS })
    return result === 'OK'
}

export async function releaseVariantLock({ variantKey }: { variantKey: string }): Promise<void> {
    await redis.del(variantLockKey(variantKey))
}

export async function isVariantLocked({ variantKey }: { variantKey: string }): Promise<boolean> {
    const result = await redis.exists(variantLockKey(variantKey))
    return result === 1
}

type AssetsRecord = {
    [key: string]: AssetMetadataValue,
}

async function loadAssetMetadata({ id, project }: { id: string, project: string }): Promise<AssetMetadata | undefined> {
    const data = await redis.hget<AssetMetadataValue>(assetsKey(project), id)
    if (!data) {
        return undefined
    }
    return { id, ...data }
}

// Get all stored assets
async function loadAllAssetMetadata({ project }: { project: string }): Promise<AssetMetadata[]> {
    const data = await redis.hgetall<AssetsRecord>(assetsKey(project))
    if (!data) {
        return []
    } else {
        return Object.entries(data).map(
            ([id, data]) => ({ id, ...data })
        )
    }
}