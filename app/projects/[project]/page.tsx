import { getAllAssetMetadata } from "@/shared/metadataStore"
import ConsolePage from "./ConsolePage"
import { sortAssets } from "@/shared/assets"
import { Authenticator, } from "./Authenticator"
import { isAuthorized } from "@/shared/auth"

export default async function Page({
    params, searchParams,
}: {
    params: Promise<{
        project: string,
    }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { project } = await params
    if (!await isAuthorized(project)) {
        return <Authenticator project={project} />
    }
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