import { revalidateTag } from "next/cache"
import { getProjectConfig } from "@/shared/projects"

export function revalidateTagsForAssetUpdates(
    assetIds: string[],
    project: string,
    profile: string,
) {
    const internal = new Set<string>()
    const external = new Set<string>()
    for (const assetId of assetIds) {
        internal.add(tagForAssetId(assetId, project))
        external.add(externalTagForAssetId(assetId))
    }
    revalidateTags({
        internal,
        external,
        profile,
        project,
    })
}

export function revalidateTagsForAssetCreations(
    assetIds: string[],
    project: string,
    profile: string,
) {
    const internal = new Set<string>()
    const external = new Set<string>()
    for (const assetId of assetIds) {
        internal.add(tagForAssetId(assetId, project))
        external.add(externalTagForAssetId(assetId))
    }
    internal.add(tagForAssetIndex(project))
    external.add(externalTagForAssetIndex())
    revalidateTags({
        internal,
        external,
        profile,
        project,
    })
}

export function revalidateTagsForAssetDeletions(
    assetIds: string[],
    project: string,
    profile: string,
) {
    return revalidateTagsForAssetCreations(assetIds, project, profile)
}

export function cacheTagForAssetsIndex(project: string) {
    return tagForAssetIndex(project)
}

export function cacheTagForAssetId(assetId: string, project: string) {
    return tagForAssetId(assetId, project)
}

// --- Helpers ---


function tagForAssetIndex(project: string) {
    return `${project}-asset-index`
}

function tagForAssetId(id: string, project: string) {
    return `${project}-asset-${id}`
}

function externalTagForAssetIndex() {
    return `crow-asset-index`
}

function externalTagForAssetId(id: string) {
    return `crow-asset-${id}`
}

function revalidateTags({ internal, external, profile, project }: {
    internal: Set<string>,
    external: Set<string>,
    profile: string,
    project: string,
}) {
    const { revalidateTagHook } = getProjectConfig(project) ?? {}
    for (const tag of Array.from(internal)) {
        revalidateTag(tag, profile)
    }
    if (revalidateTagHook) {
        for (const tag of Array.from(external)) {
            revalidateTagHook(tag)
        }
    }
}
