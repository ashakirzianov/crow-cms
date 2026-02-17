import sharp from 'sharp'

const MAX_AREA = 1500 * 1500

export type ProcessedImage = {
    buffer: Buffer
    width: number
    height: number
    format: string
    originalName: string
    newName?: string
}

/**
 * Stage 1: Process the image
 * Validates that the file is an image, checks dimensions, and resizes if needed
 */
export async function processImage(file: File): Promise<{
    success: boolean;
    message: string;
    image?: ProcessedImage;
}> {
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

        let processedBuffer = buffer
        let finalWidth = metadata.width
        let finalHeight = metadata.height

        // Resize image if width exceeds maximum
        if (metadata.width * metadata.height > MAX_AREA) {
            // Calculate new height to maintain aspect ratio
            const factor = Math.sqrt(MAX_AREA / (metadata.width * metadata.height))
            finalWidth = Math.round(metadata.width * factor)
            finalHeight = Math.round(metadata.height * factor)

            // Resize the image
            const resizedBuffer = await image
                .resize(finalWidth, finalHeight, { fit: 'inside' })
                .toBuffer()

            // Convert to standard Buffer type to avoid type issues
            processedBuffer = Buffer.from(resizedBuffer)
        }

        return {
            success: true,
            message: 'Image processed successfully',
            image: {
                buffer: processedBuffer,
                width: finalWidth,
                height: finalHeight,
                format: metadata.format,
                originalName: file.name
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
    file, width, quality,
}: {
    width?: number,
    quality?: number,
    file: File,
}): Promise<{
    success: boolean;
    message: string;
    image?: ProcessedImage;
}> {
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

        const newName = `${file.name}@${width !== undefined ? `w${width}` : ''}${quality !== undefined ? `q${quality}` : ''}.webp`
        return {
            success: true,
            message: 'Image processed successfully',
            image: {
                buffer: processedBuffer,
                width: info.width,
                height: info.height,
                format: info.format,
                originalName: file.name,
                newName: newName
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