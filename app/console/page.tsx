import { getAllAssetMetadata } from "@/shared/metadataStore"
import ConsolePage from "./ConsolePage"
import { sortAssets } from "@/shared/assets"
import { Authenticator, } from "./Authenticator"
import { isAuthenticated } from "@/shared/auth"

export default async function Page({ searchParams }: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    if (!await isAuthenticated()) {
        return <Authenticator />
    }
    const resolved = await searchParams
    const unsorted = await getAllAssetMetadata()
    const assets = sortAssets(unsorted)
    return <ConsolePage
        assets={assets}
        searchParams={resolved}
        shallow
    />
}