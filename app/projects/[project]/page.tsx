import { getAllAssetMetadata } from "@/shared/metadataStore"
import ConsolePage from "./ConsolePage"
import { sortAssets } from "@/shared/assets"
import { Authenticator, } from "./Authenticator"
import { isAuthenticated } from "@/shared/auth"

export default async function Page({
    params, searchParams,
}: {
    params: Promise<{
        project: string,
    }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    if (!await isAuthenticated()) {
        return <Authenticator />
    }
    const { project } = await params
    const resolved = await searchParams
    const unsorted = await getAllAssetMetadata({ project })
    const assets = sortAssets(unsorted)
    return <ConsolePage
        project={project}
        assets={assets}
        searchParams={resolved}
        shallow
    />
}