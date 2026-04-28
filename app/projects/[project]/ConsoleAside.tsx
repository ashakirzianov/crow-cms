import { AssetMetadata, AssetQuery, assetsForQuery, extractUniqueKinds, extractUniqueTags, getAssetsOrderRange } from "@/shared/assets"
import FileUploader from "./FileUploader"
import { JsonEditor } from "./JsonEditor"
import AssetEditor from "./AssetEditor"
import WorkersPane from "./WorkersPane"
import OrphanAside from "./OrphanAside"
import Link from "next/link"

export default function ConsoleAside({
    project,
    assets, query, action, assetId, orphanFileName,
    closeHref, shallow,
}: {
    project: string,
    assets: AssetMetadata[],
    query: AssetQuery,
    action: string | undefined,
    assetId: string | undefined,
    orphanFileName: string | undefined,
    closeHref: string,
    shallow?: boolean,
}) {
    switch (action) {
        case 'upload':
            return <AsideWrapper title="Upload" closeHref={closeHref} shallow={shallow}>
                <FileUploader project={project} />
            </AsideWrapper>
        case 'json':
            const filterd = assetsForQuery(assets, query)
            const json = JSON.stringify(filterd, null, 2)
            return <AsideWrapper title="JSON" closeHref={closeHref} shallow={shallow}>
                <JsonEditor project={project} initialJson={json} />
            </AsideWrapper>
        case 'edit':
            const asset = assets.find(a => a.id === assetId)
            if (asset === undefined) {
                return null
            }
            const orderRange = getAssetsOrderRange(assets)
            const kinds = extractUniqueKinds(assets)
            const tags = extractUniqueTags(assets)
            return <AssetEditor
                key={asset.id}
                project={project}
                asset={asset}
                orderRange={orderRange}
                kinds={kinds}
                tags={tags}
                closeHref={closeHref}
                shallow={shallow}
            />
        case 'workers':
            return <AsideWrapper title="Workers" closeHref={closeHref} shallow={shallow}>
                <WorkersPane project={project} />
            </AsideWrapper>
        case 'orphan':
            if (!orphanFileName) return null
            return <AsideWrapper title="Orphan" closeHref={closeHref} shallow={shallow}>
                <OrphanAside key={orphanFileName} project={project} fileName={orphanFileName} />
            </AsideWrapper>
        default:
            return null
    }
}

function AsideWrapper({ title, closeHref, shallow, children }: {
    title: string,
    closeHref: string,
    shallow?: boolean,
    children: React.ReactNode,
}) {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{title}</h2>
                <Link
                    href={closeHref}
                    shallow={shallow}
                    className="text-accent hover:opacity-60 text-sm"
                >
                    ✕ close
                </Link>
            </div>
            {children}
        </div>
    )
}