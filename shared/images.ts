import sharp from 'sharp'
import { Result } from './result'
import { variantFileName, VariantSpec } from './variants'

export type ProcessedImage = {
    buffer: Buffer
    width: number
    height: number
    fileName: string
    format: string
    contentType: string
}

/**
 * Stage 1: Process the image
 * Validates that the file is an image, checks dimensions, and resizes if needed
 */
export async function processImageFile(file: File): Promise<Result<{
    image: ProcessedImage;
}>> {
    try {
        // Check if the file is an image based on MIME type
        if (!file.type.startsWith('image/')) {
            return {
                success: false,
                message: 'File is not an image. Only image files are supported.'
            }
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Use sharp to process the image
        const image = sharp(buffer)
            .rotate() // Auto-rotate based on EXIF data

        // Get image metadata
        const metadata = await image.metadata()

        if (!metadata.width || !metadata.height || !metadata.format) {
            return {
                success: false,
                message: 'Could not determine image dimensions or format'
            }
        }

        return {
            success: true,
            message: 'Image processed successfully',
            image: {
                buffer: buffer,
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                fileName: file.name,
                contentType: file.type,
            }
        }
    } catch (error) {
        console.error('Error processing image:', error)
        return {
            success: false,
            message: error instanceof Error
                ? `Image processing error: ${error.message}`
                : 'Unknown image processing error'
        }
    }
}

export async function createImageVariant({
    buffer, originalName, variant,
}: {
    buffer: Buffer,
    originalName: string,
    variant: VariantSpec,
}): Promise<Result<{
    image: ProcessedImage;
}>> {
    try {

        const { width, quality, format = 'webp' } = variant
        if (format !== 'webp') {
            return {
                success: false,
                message: `Unsupported format requested: ${format}. Only "webp" is supported.`
            }
        }
        // Use sharp to process the image
        let image = sharp(buffer, {
            animated: true, // Support animated images (e.g. GIFs)
            failOnError: false,
            limitInputPixels: 268402689, // ~16k x 16k; pick what you want
            sequentialRead: true,
        })
            .rotate() // Auto-rotate based on EXIF data

        // Resize image if width is specified and different from original
        if (width !== undefined) {
            // Resize the image
            image = image
                .resize({ width, withoutEnlargement: true })
        }
        image = image.webp({
            quality: quality ?? 80,
            effort: 5,
            smartSubsample: true,
        })

        const { data, info } = await image
            .toBuffer({ resolveWithObject: true })

        // Convert to standard Buffer type to avoid type issues
        const processedBuffer = Buffer.from(data)

        const newName = variantFileName({ originalName, variant })
        return {
            success: true,
            message: 'Image processed successfully',
            image: {
                buffer: processedBuffer,
                width: info.width,
                height: info.height,
                format: info.format,
                contentType: 'image/webp',
                fileName: newName,
            }
        }
    } catch (error) {
        console.error('Error processing image:', error)
        return {
            success: false,
            message: error instanceof Error
                ? `Image processing error: ${error.message}`
                : 'Unknown image processing error'
        }
    }
}
