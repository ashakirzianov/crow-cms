import { NextRequest, NextResponse } from "next/server"
import { getAssetMetadata } from "@/shared/metadataStore"
import { requestVariant } from "@/shared/fileStore"
import { downloadFromStorage } from "@/shared/blobStore"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string, assetId: string }> },
) {
    const { project, assetId } = await params

    const asset = await getAssetMetadata({ id: assetId, project })
    if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const width = numberParam(request, 'width')
    const quality = numberParam(request, 'quality')

    const result = await requestVariant({ fileName: asset.fileName, project, width, quality })
    if (!result.success) {
        if (result.locked) {
            console.info(`Variant for asset "${assetId}" is currently being generated. Client should retry after some time.`)
            return new NextResponse(null, {
                status: 404,
                headers: { 'Cache-Control': 'public, max-age=1' },
            })
        }
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

    if (!result.key) {
        return NextResponse.json({ error: "Failed to generate variant" }, { status: 500 })
    }

    const buffer = result.buffer
        ? result.buffer
        : await downloadFromStorage({ key: result.key })

    if (!buffer) {
        return NextResponse.json({ error: "Failed to retrieve variant" }, { status: 500 })
    }

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}

function numberParam(request: NextRequest, name: string): number | undefined {
    const value = request.nextUrl.searchParams.get(name)
    if (value === null) return undefined
    const num = Number(value)
    return Number.isFinite(num) ? num : undefined
}
