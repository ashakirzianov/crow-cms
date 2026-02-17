import Image from "next/image"
import { AssetMetadata, assetAlt, assetHeight, assetSrc, assetWidth } from "./assets"

export type AssetImageSize = 'medium' | 'full'

interface AssetImageProps {
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

export function AssetImage({ asset, size, style }: AssetImageProps) {
    const [width, height] = getDimensionsForAsset(asset, size)
    return (
        <Image
            src={assetSrc(asset)}
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
