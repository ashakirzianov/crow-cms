import { cacheTag, revalidateTag } from "next/cache"
import { getProjectConfig } from "@/shared/projects"

export function revalidateAssetCacheTags(project: string, profile: string) {
    revalidateTags({
        internal: new Set([tagForAssetIndex(project)]),
        external: new Set([externalContentTag()]),
        profile,
        project,
    })
}

export function cacheTagForAssetsIndex(project: string) {
    cacheTag(tagForAssetIndex(project))
}

export function cacheTagForAssetId(assetId: string, project: string) {
    cacheTag(tagForAssetId(assetId, project))
}

// --- Helpers ---


function tagForAssetIndex(project: string) {
    return `${project}-asset-index`
}

function tagForAssetId(id: string, project: string) {
    return `${project}-asset-${id}`
}

function externalContentTag() {
    return `crow-content`
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
