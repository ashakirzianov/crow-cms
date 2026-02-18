import { Result } from "./result"

export function variantSrc({
    variantName, project,
}: { variantName: string, project: string }) {
    return `https://${process.env.NEXT_PUBLIC_ASSETS_DOMAIN}/${project}/variants/${variantName}`
}

export function variantFileName({
    originalName, width, quality, format,
}: {
    originalName: string, format: string,
    width?: number, quality?: number,
}): string {
    return `${originalName}@${width !== undefined ? `w${width}` : ''}${quality !== undefined ? `q${quality}` : ''}.${format}`
}

// Target format is '{originalName_with_extension}@w{width}q{quality}.{format}', where width and quality are optional
export function parseVariantFileName(variantFileName: string): Result<{
    originalName: string, format: string, width?: number, quality?: number,
}> {
    const lastAt = variantFileName.lastIndexOf('@')
    if (lastAt === -1) {
        return {
            success: false,
            message: `Invalid variant name format: "${variantFileName}". Expected format is "{originalName_with_extension}@w{width}q{quality}.{format}", where width and quality are optional.`
        }
    }
    const [originalName, variantPart] = [variantFileName.substring(0, lastAt), variantFileName.substring(lastAt + 1)]
    const match = variantPart.match(/^(?:w(\d+))?(?:q(\d+))?\.(\w+)$/)
    if (!match) {
        return {
            success: false,
            message: `Invalid variant name format: "${variantFileName}". Expected format is "{originalName_with_extension}@w{width}q{quality}.{format}", where width and quality are optional.`
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