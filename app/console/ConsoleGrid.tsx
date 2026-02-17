import { AssetMetadata } from "@/shared/assets"
import Link from "next/link"
import clsx from "clsx"
import { AssetImage } from "@/shared/AssetImage"
import { hrefForConsole } from "@/shared/href"

// Component for the asset grid
export function ConsoleGrid({
    filter, assets, selectedAssetId, shallow,
}: {
    filter: string,
    assets: AssetMetadata[],
    selectedAssetId: string | undefined,
    shallow?: boolean,
}) {
    return (<>
        <section className="text-accent">
            <span>{assets.length} assets in collection</span>
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {assets.map((asset) => (
                <AssetCard
                    key={asset.id}
                    filter={filter}
                    asset={asset}
                    isSelected={asset.id === selectedAssetId}
                    shallow={shallow}
                />
            ))}
        </section>
    </>)
}

// Component for displaying tags in an asset card
function AssetCardTags({ tags }: { tags?: string[] }) {
    if (!tags || tags.length === 0) return null

    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 px-1 rounded">
                    {tag}
                </span>
            ))}
        </div>
    )
}

// Component for a single asset card
function AssetCard({
    asset, isSelected, shallow, filter,
}: {
    asset: AssetMetadata,
    isSelected: boolean,
    shallow?: boolean,
    filter: string,
}) {
    return (
        <Link href={hrefForConsole({
            filter,
            action: 'edit',
            assetId: asset.id,
        })} shallow={shallow}>
            <div
                className={clsx("border p-2 cursor-pointer hover:bg-gray-100", {
                    "border-accent bg-gray-100": isSelected,
                    "border-gray-200": !isSelected
                })}
            >
                <div className="h-32 flex items-center justify-center">
                    <div className="h-full relative w-full">
                        <AssetImage
                            asset={asset}
                            size="medium"
                            style={{
                                objectFit: 'contain',
                                width: '100%',
                                height: '100%',
                                position: 'absolute'
                            }}
                        />
                    </div>
                </div>
                <div className="mt-2">
                    <div className="text-sm text-gray-500">ID: {asset.id}</div>
                    <div className="font-medium truncate">{asset.title || 'Untitled'}</div>
                    <div className="text-xs text-gray-400">{asset.kind}</div>
                    <AssetCardTags tags={asset.tags} />
                </div>
            </div>
        </Link>
    )
}