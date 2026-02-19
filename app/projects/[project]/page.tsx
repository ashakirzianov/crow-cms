import { getAllAssetMetadata } from "@/shared/metadataStore"
import ConsolePage from "./ConsolePage"
import { sortAssets } from "@/shared/assets"
import { Authenticator, } from "./Authenticator"
import { isAuthorized } from "@/shared/auth"
import { getAllProjects } from "@/shared/projects"
import { Suspense } from "react"

type Props = {
    project: string,
}

export async function generateStaticParams(): Promise<Props[]> {
    return getAllProjects().map(project => ({ project }))
}

type Input = {
    params: Promise<Props>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>,
}

export default async function Page(input: Input) {
    return <Suspense fallback={<div>Loading...</div>}>
        <PageImpl {...input} />
    </Suspense>
}

export async function PageImpl({
    params, searchParams,
}: {
    params: Promise<Props>,
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