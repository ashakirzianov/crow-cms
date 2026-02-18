import Image from "next/image"
import { AssetMetadata, assetAlt, assetFileName, assetHeight, assetWidth } from "./assets"
import { variantSrc, variantFileName } from "./variants"

export type AssetImageSize = 'medium' | 'full'

interface AssetImageProps {
    project: string
    asset: AssetMetadata
    size: AssetImageSize
    style?: React.CSSProperties
}

function getDimensionsForAsset(asset: AssetMetadata, _size: AssetImageSize): [number, number] {
    const width = assetWidth(asset)
    const height = assetHeight(asset)
    // const widths: Record<AssetImageSize, number> = {
    //     medium: 600,
    //     full: width,
    // }
    // const aspect = width / height
    // return [
    //     widths[size],
    //     Math.round(widths[size] / aspect),
    // ]
    return [width, height]
}

export function AssetImage({ project, asset, size, style }: AssetImageProps) {
    const [width, height] = getDimensionsForAsset(asset, size)
    return (
        <Image
            src={variantSrc({
                variantName: variantFileName({
                    originalName: assetFileName(asset),
                    format: 'webp',
                }),
                project,
            })}
            unoptimized
            alt={assetAlt(asset)}
            width={width}
            height={height}
            style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                ...style,
            }}
        />
    )
}
