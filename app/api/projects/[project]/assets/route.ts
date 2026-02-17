import { NextRequest, NextResponse } from "next/server"
import { getAllAssetMetadata } from "@/shared/metadataStore"
import { AssetMetadata, sortAssets } from "@/shared/assets"
import { isApiAuthorized } from "@/shared/auth"

export type GetResponse = AssetMetadata[]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string }> },
) {
    const { project } = await params
    if (!await isApiAuthorized(request, project)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assets = await getAllAssetMetadata({ project })
    const response: GetResponse = sortAssets(assets ?? [])
    return NextResponse.json(response)
}
