import { revalidateTag } from "next/cache"
import { AssetMetadata, AssetMetadataUpdate } from "@/shared/assets"
import { getProjectConfig } from "@/shared/projects"

export function revalidateTagsForAssetUpdates(
    updates: { asset: AssetMetadata, update: AssetMetadataUpdate }[],
    project: string,
    profile: string,
) {
    const tags = mergeTags(updates.map(({ asset, update }) => tagsForAssetUpdate(asset, update, project)))
    tags.internal.push(tagForAssetIndex(project))
    tags.external.push(externalTagForAssetIndex())
    revalidateTags(tags, profile, project)
}

export function revalidateTagsForAssetCreations(
    assets: AssetMetadata[],
    project: string,
    profile: string,
) {
    revalidateTags(mergeTags(assets.map(asset => tagsForAsset(asset, project))), profile, project)
}

export function revalidateTagsForAssetDeletions(
    assets: AssetMetadata[],
    project: string,
    profile: string,
) {
    revalidateTags(mergeTags(assets.map(asset => tagsForAsset(asset, project))), profile, project)
}

// --- Helpers ---

function mergeTags(all: { internal: string[], external: string[] }[]): { internal: string[], external: string[] } {
    return {
        internal: Array.from(new Set(all.flatMap(t => t.internal))),
        external: Array.from(new Set(all.flatMap(t => t.external))),
    }
}

export function tagForAssetIndex(project: string) {
    return `${project}-asset-index`
}

export function tagForAssetId(id: string, project: string) {
    return `${project}-asset-${id}`
}

function tagForYear(year: number, project: string) {
    return `${project}-asset-year-${year}`
}

function tagForMaterial(material: string, project: string) {
    return `${project}-asset-material-${material}`
}

function tagForAssetTag(tag: string, project: string) {
    return `${project}-asset-tag-${tag}`
}

function externalTagForAssetIndex() {
    return `crow-asset-index`
}

function externalTagForAssetId(id: string) {
    return `crow-asset-${id}`
}

function externalTagForYear(year: number) {
    return `crow-asset-year-${year}`
}

function externalTagForMaterial(material: string) {
    return `crow-asset-material-${material}`
}

function externalTagForAssetTag(tag: string) {
    return `crow-asset-tag-${tag}`
}

function tagsForAsset(asset: AssetMetadata, project: string): {
    internal: string[],
    external: string[],
} {
    const internal: string[] = [tagForAssetId(asset.id, project), tagForAssetIndex(project)]
    const external: string[] = [externalTagForAssetId(asset.id), externalTagForAssetIndex()]

    if (asset.year !== undefined) {
        internal.push(tagForYear(asset.year, project))
        external.push(externalTagForYear(asset.year))
    }

    if (asset.material !== undefined) {
        internal.push(tagForMaterial(asset.material, project))
        external.push(externalTagForMaterial(asset.material))
    }

    for (const tag of asset.tags ?? []) {
        internal.push(tagForAssetTag(tag, project))
        external.push(externalTagForAssetTag(tag))
    }

    return { internal, external }
}

function tagsForAssetUpdate(asset: AssetMetadata, update: AssetMetadataUpdate, project: string): {
    internal: string[],
    external: string[],
} {
    const internal: string[] = [tagForAssetId(asset.id, project)]
    const external: string[] = [externalTagForAssetId(asset.id)]

    if (asset.year !== update.year) {
        for (const year of [asset.year, update.year]) {
            if (year !== undefined) {
                internal.push(tagForYear(year, project))
                external.push(externalTagForYear(year))
            }
        }
    }

    if (asset.material !== update.material) {
        for (const material of [asset.material, update.material]) {
            if (material !== undefined) {
                internal.push(tagForMaterial(material, project))
                external.push(externalTagForMaterial(material))
            }
        }
    }

    const oldTags = asset.tags ?? []
    const newTags = update.tags ?? []
    const changedTags = [
        ...oldTags.filter(t => !newTags.includes(t)),
        ...newTags.filter(t => !oldTags.includes(t)),
    ]
    for (const tag of changedTags) {
        internal.push(tagForAssetTag(tag, project))
        external.push(externalTagForAssetTag(tag))
    }

    return { internal, external }
}

function revalidateTags({ internal, external }: { internal: string[], external: string[] }, profile: string, project: string) {
    const { revalidateTagHook } = getProjectConfig(project) ?? {}
    for (const tag of internal) {
        revalidateTag(tag, profile)
    }
    for (const tag of external) {
        revalidateTagHook?.(tag)
    }
}
