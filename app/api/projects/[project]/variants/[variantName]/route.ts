import { NextRequest, NextResponse } from "next/server"
import { requestVariant, VARIANT_LOCKED_MESSAGE } from "@/shared/fileStore"
import { parseVariantFileName } from "@/shared/variants"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string, variantName: string }> },
) {
    const { project, variantName } = await params
    const parseResult = parseVariantFileName(variantName)
    if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.message }, { status: 400 })
    }
    const { originalName, width, quality, format } = parseResult
    const result = await requestVariant({
        fileName: originalName, downloadExisting: true,
        project, width, quality, format,
    })
    if (!result.success) {
        if (result.message === VARIANT_LOCKED_MESSAGE) {
            console.info(`Variant for file "${variantName}" is currently being generated. Client should retry after some time.`)
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

    if (!result.buffer) {
        return NextResponse.json({ error: "Variant generated but failed to retrieve file buffer" }, { status: 500 })
    }

    const buffer = result.buffer
    const array = new Uint8Array(buffer)

    return new NextResponse(array, {
        headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}