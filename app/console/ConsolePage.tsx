import { AssetMetadata, assetsForQuery, extractUniqueKinds, extractUniqueTags } from "@/shared/assets"
import ConsoleHeader from "./ConsoleHeader"
import clsx from "clsx"
import { ConsoleGrid } from "./ConsoleGrid"
import ConsoleAside from "./ConsoleAside"

export type ConsoleSearchParams = { [key: string]: string | string[] | undefined }
export default function ConsolePage({
    assets, searchParams, shallow,
}: {
    assets: AssetMetadata[],
    searchParams: ConsoleSearchParams,
    shallow?: boolean,
}) {
    const kinds = extractUniqueKinds(assets)
    const tags = extractUniqueTags(assets)
    const { action, filter: filterParam, assetId } = parseSearchParams(searchParams)
    const filter = filterParam ?? 'all'
    const query = filter === 'all' ? null : filter
    const filteredAssets = assetsForQuery(assets, query)
    const aside = <ConsoleAside
        assets={assets}
        query={query}
        action={action}
        assetId={assetId}
    />
    return <section className="flex flex-col h-screen">
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="w-full">
                <ConsoleHeader
                    kinds={kinds}
                    tags={tags}
                    selectedFilter={filter}
                    selectedAction={action}
                    shallow={shallow}
                />
            </header>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main content */}
                <main className={clsx("flex-1 overflow-auto p-4 w-full")}>
                    <ConsoleGrid
                        filter={filter}
                        assets={filteredAssets}
                        selectedAssetId={assetId}
                        shallow={shallow}
                    />
                </main>

                {/* Sticky Aside */}
                {aside && (
                    <aside className="w-1/3 p-4 overflow-auto">
                        <div className="sticky top-0">
                            {aside}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    </section>
}


type ParsedSearchParams = {
    action?: string,
    filter?: string,
    assetId?: string,
}
function parseSearchParams(searchParams: ConsoleSearchParams): ParsedSearchParams {
    const result: ParsedSearchParams = {}
    const { aside, filter } = searchParams
    if (typeof aside === 'string') {
        if (aside.startsWith('edit:')) {
            result.assetId = aside.slice('edit:'.length)
            result.action = 'edit'
        } else {
            result.action = aside
        }
    }
    if (typeof filter === 'string') {
        result.filter = filter
    }

    return result
}