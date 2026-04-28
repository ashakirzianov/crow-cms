import { AssetMetadata } from "@/shared/assets"
import Link from "next/link"
import clsx from "clsx"
import { AssetImage } from "@/shared/AssetImage"
import { hrefForConsole } from "@/shared/href"

export function ConsoleGrid({
    filter, assets, selectedAssetId, shallow, project,
}: {
    filter: string,
    assets: AssetMetadata[],
    selectedAssetId: string | undefined,
    shallow?: boolean,
    project: string,
}) {
    const columns = buildColumns(assets, 4)
    return (<>
        <section className="text-accent">
            <span>{assets.length} assets in collection</span>
        </section>
        <div className="flex flex-row gap-2 w-full">
            {columns.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col w-1/4 gap-1 overflow-hidden min-w-0">
                    {column.map((asset) => (
                        <AssetCard
                            key={asset.id}
                            project={project}
                            filter={filter}
                            asset={asset}
                            isSelected={asset.id === selectedAssetId}
                            shallow={shallow}
                        />
                    ))}
                </div>
            ))}
        </div>
    </>)
}

function buildColumns(assets: AssetMetadata[], count: number) {
    const columns: AssetMetadata[][] = Array.from({ length: count }, () => [])
    assets.forEach((asset, index) => {
        columns[index % count].push(asset)
    })
    return columns
}

function assetDescription(asset: AssetMetadata): string {
    const parts: string[] = []
    if (asset.title) parts.push(asset.title)
    const details: string[] = []
    if (asset.year) details.push(String(asset.year))
    if (asset.material) details.push(asset.material)
    if (details.length > 0) parts.push(`(${details.join(', ')})`)
    return parts.join(' ')
}

function AssetCard({
    project, asset, isSelected, shallow, filter,
}: {
    project: string,
    asset: AssetMetadata,
    isSelected: boolean,
    shallow?: boolean,
    filter: string,
}) {
    return (
        <Link href={hrefForConsole({
            project,
            filter,
            action: 'edit',
            assetId: asset.id,
        })} shallow={shallow}>
            <div className={clsx("flex flex-col break-inside-avoid-column", {
                "ring-2 ring-accent": isSelected,
            })}>
                <AssetImage
                    project={project}
                    asset={asset}
                    size="medium"
                />
                <span className="text-xs text-accent block overflow-hidden min-w-0 wrap-break-word">
                    {assetDescription(asset)}
                </span>
            </div>
        </Link>
    )
}
