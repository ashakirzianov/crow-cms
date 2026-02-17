import { NextRequest, NextResponse } from "next/server"
import { isAuthorized } from "@/shared/auth"
import { getAssetMetadata } from "@/shared/metadataStore"
import { AssetMetadata } from "@/shared/assets"
import { originalsRoot } from "@/shared/href"

export type GetResponse = {
    asset: AssetMetadata,
    root: string,
}
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string, assetId: string }> },
) {
    const { project, assetId } = await params
    if (!await isAuthorized(project) && false) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const asset = await getAssetMetadata({ id: assetId, project })
    if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const root = originalsRoot(project)
    const response: GetResponse = {
        asset,
        root,
    }
    return NextResponse.json(response)
}
