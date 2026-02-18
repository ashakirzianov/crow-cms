import { NextRequest, NextResponse } from "next/server"
import { getAssetMetadata } from "@/shared/metadataStore"
import { AssetMetadata } from "@/shared/assets"
import { isApiAuthorized } from "@/shared/auth"

export type GetResponse = AssetMetadata
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string, assetId: string }> },
) {
    const { project, assetId } = await params
    if (!await isApiAuthorized(request, project)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const asset = await getAssetMetadata({ id: assetId, project })
    if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const response: GetResponse = asset
    return NextResponse.json(response)
}
