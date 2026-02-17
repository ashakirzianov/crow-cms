import { Redis } from '@upstash/redis'
import { AssetMetadata, AssetMetadataUpdate } from './assets'

type AssetMetadataValue = Omit<AssetMetadata, 'id'>

// Initialize Redis
const redis = Redis.fromEnv()

type AssetsCache = {
    [project: string]: AssetMetadata[] | null
}
let allAssets: AssetsCache = {}
function invalidateCache() {
    allAssets = {}
}

function assetsKey(project: string) {
    return `crow-cms:assets:${project}`
}

export async function getAllAssetMetadata({ project, force }: {
    project: string,
    force?: boolean,
}) {
    if (force || !allAssets[project]) {
        allAssets[project] = await loadAllAssetMetadata({ project })
        setTimeout(invalidateCache, 1000 * 60 * 1) // Invalidate cache after 1 minute
    }
    return allAssets[project]
}

export async function getAssetMetadata({ id, project }: { id: string, project: string }) {
    if (null !== allAssets) {
        const asset = allAssets[project]?.find((asset) => asset.id === id)
        if (asset) {
            return asset
        }
    }
    return loadAssetMetadata({ id, project })
}

export async function getAssetNames({ project }: { project: string }) {
    return redis.hkeys(assetsKey(project))
}

// Store a single asset
export async function storeAsset({ asset, project }: { asset: AssetMetadata, project: string }): Promise<boolean> {
    if (!asset.fileName) throw new Error('Asset must have a URL')
    const { id, ...metadata } = asset

    await redis.hset(assetsKey(project), {
        [id]: JSON.stringify(metadata),
    })
    invalidateCache()

    return true
}

// Store multiple assets
export async function storeAssets({ assets, project }: { assets: AssetMetadata[], project: string }): Promise<boolean> {
    const entries: AssetsRecord = {}

    for (const asset of assets) {
        if (!asset.id) {
            continue
        }
        const { id, ...metadata } = asset
        entries[id] = metadata
    }

    await redis.hset(assetsKey(project), entries)
    invalidateCache()

    return true
}

// Delete a single asset
export async function deleteAssetMetadata({ id, project }: { id: string, project: string }): Promise<boolean> {
    const result = await redis.hdel(assetsKey(project), id)
    invalidateCache()
    return result > 0
}

export async function applyMetadataUpdates(
    { project, updates }: { project: string, updates: AssetMetadataUpdate[] }) {
    const data = await redis.hgetall<AssetsRecord>(assetsKey(project))
    if (!data) {
        return false
    }
    const assetStore: AssetsRecord = {}
    for (const update of updates) {
        const { id, ...metadata } = update
        if (data[id]) {
            assetStore[id] = {
                ...data[id],
                ...metadata,
            }
        }
    }

    if (Object.keys(assetStore).length > 0) {
        await redis.hset(assetsKey(project), assetStore)
        invalidateCache()
        return true
    } else {
        return false
    }
}

export async function cleanMetadataStore({ project }: { project: string }) {
    await redis.del(assetsKey(project))
    invalidateCache()
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