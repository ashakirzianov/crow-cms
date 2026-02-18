import { NextRequest, NextResponse } from "next/server"
import { requestVariant, VARIANT_LOCKED_MESSAGE } from "@/shared/fileStore"
import { Result } from "@/shared/result"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ project: string, variantName: string }> },
) {
    const { project, variantName } = await params
    const parseResult = parseVariantName(variantName)
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

// Target format is '{originalName_with_extension}@{width}w{quality}q.{format}', where width and quality are optional
function parseVariantName(variantName: string): Result<{
    originalName: string, format: string, width?: number, quality?: number,
}> {
    const lastAt = variantName.lastIndexOf('@')
    if (lastAt === -1) {
        return {
            success: false,
            message: `Invalid variant name format: "${variantName}". Expected format is "{originalName_with_extension}@{width}w{quality}q.{format}", where width and quality are optional.`
        }
    }
    const [originalName, variantPart] = [variantName.substring(0, lastAt), variantName.substring(lastAt + 1)]
    const match = variantPart.match(/^(?:(\d+)w)?(?:(\d+)q)?\.(\w+)$/)
    if (!match) {
        return {
            success: false,
            message: `Invalid variant name format: "${variantName}". Expected format is "{originalName_with_extension}@{width}w{quality}q.{format}", where width and quality are optional.`
        }
    }
    const [, widthStr, qualityStr, format] = match
    const width = widthStr ? parseInt(widthStr) : undefined
    const quality = qualityStr ? parseInt(qualityStr) : undefined

    return {
        success: true,
        message: 'Variant name parsed successfully',
        originalName,
        format,
        width,
        quality,
    }
}
