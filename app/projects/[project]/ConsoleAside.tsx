import { AssetMetadata, AssetQuery, assetsForQuery, extractUniqueKinds, extractUniqueTags, getAssetsOrderRange } from "@/shared/assets"
import FileUploader from "./FileUploader"
import { JsonEditor } from "./JsonEditor"
import AssetEditor from "./AssetEditor"
import WorkersPane from "./WorkersPane"

export default function ConsoleAside({
    project,
    assets, query, action, assetId,
}: {
    project: string,
    assets: AssetMetadata[],
    query: AssetQuery,
    action: string | undefined,
    assetId: string | undefined,
}) {
    switch (action) {
        case 'upload':
            return <FileUploader project={project} />
        case 'json':
            const filterd = assetsForQuery(assets, query)
            const json = JSON.stringify(filterd, null, 2)
            return <JsonEditor project={project} initialJson={json} />
        case 'edit':
            const asset = assets.find(a => a.id === assetId)
            if (asset === undefined) {
                return null
            }
            const orderRange = getAssetsOrderRange(assets)
            const kinds = extractUniqueKinds(assets)
            const tags = extractUniqueTags(assets)
            return <AssetEditor
                key={asset.id} // Add key to ensure component re-mounts when asset changes
                project={project}
                asset={asset}
                orderRange={orderRange}
                kinds={kinds}
                tags={tags}
            />
        case 'workers':
            return <WorkersPane project={project} />
        default:
            return null
    }
}