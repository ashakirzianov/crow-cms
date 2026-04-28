import { AssetMetadata, assetsForQuery, extractUniqueKinds, extractUniqueTags } from "@/shared/assets"
import ConsoleHeader from "./ConsoleHeader"
import { ConsoleGrid } from "./ConsoleGrid"
import ConsoleAside from "./ConsoleAside"
import OrphansGrid from "./OrphansGrid"
import { Suspense } from "react"
import Link from "next/link"
import { hrefForConsole } from "@/shared/href"

export type ConsoleSearchParams = { [key: string]: string | string[] | undefined }
export default function ConsolePage({
    project, assets, searchParams, shallow,
}: {
    project: string,
    assets: AssetMetadata[],
    searchParams: ConsoleSearchParams,
    shallow?: boolean,
}) {
    const kinds = extractUniqueKinds(assets)
    const tags = extractUniqueTags(assets)
    const { action, filter: filterParam, assetId, orphanFileName } = parseSearchParams(searchParams)
    const filter = filterParam ?? 'all'
    const query = filter === 'all' ? null : filter
    const filteredAssets = assetsForQuery(assets, query)
    const showAside = action !== undefined
    return <section className="flex flex-col h-screen">
        <div className="flex flex-col min-h-screen">
            <header className="w-full">
                <ConsoleHeader
                    project={project}
                    kinds={kinds}
                    tags={tags}
                    selectedFilter={filter}
                    selectedAction={action}
                    shallow={shallow}
                />
            </header>

            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto p-4 w-full">
                    {action === 'orphans' || action === 'orphan'
                        ? <Suspense fallback={<div className="text-accent">Loading orphans...</div>}>
                            <OrphansGrid project={project} selectedFileName={orphanFileName} />
                        </Suspense>
                        : <ConsoleGrid
                            project={project}
                            filter={filter}
                            assets={filteredAssets}
                            selectedAssetId={assetId}
                            shallow={shallow}
                        />
                    }
                </main>

                {showAside && (
                    <aside className="w-1/3 p-4 overflow-auto">
                        <div className="sticky top-0">
                            <div className="flex justify-end mb-2">
                                <Link
                                    href={hrefForConsole({ project, filter })}
                                    shallow={shallow}
                                    className="text-accent hover:text-secondary text-sm"
                                >
                                    ✕ close
                                </Link>
                            </div>
                            <ConsoleAside
                                project={project}
                                assets={assets}
                                query={query}
                                action={action}
                                assetId={assetId}
                                orphanFileName={orphanFileName}
                            />
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
    orphanFileName?: string,
}
function parseSearchParams(searchParams: ConsoleSearchParams): ParsedSearchParams {
    const result: ParsedSearchParams = {}
    const { aside, filter } = searchParams
    if (typeof aside === 'string') {
        if (aside.startsWith('edit:')) {
            result.assetId = aside.slice('edit:'.length)
            result.action = 'edit'
        } else if (aside.startsWith('orphan:')) {
            result.orphanFileName = aside.slice('orphan:'.length)
            result.action = 'orphan'
        } else {
            result.action = aside
        }
    }
    if (typeof filter === 'string') {
        result.filter = filter
    }

    return result
}