import { NextRequest, NextResponse } from "next/server"
import { isAuthorized } from "@/shared/auth"
import { getAllAssetMetadata } from "@/shared/metadataStore"
import { sortAssets } from "@/shared/assets"
import { originalsRoot } from "@/shared/href"

export type GetResponse = {
    assets: Awaited<ReturnType<typeof getAllAssetMetadata>>,
    root: string,
}
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string }> },
) {
    const { project } = await params
    if (!await isAuthorized(project) && false) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assets = await getAllAssetMetadata({ project })
    const response: GetResponse = {
        assets: sortAssets(assets ?? []),
        root: originalsRoot(project),
    }
    return NextResponse.json(response)
}
