import Image from "next/image"
import { variantSrc, variantFileName } from "@/shared/variants"
import { findOrphanedOriginals } from "./workers"

export default async function OrphansGrid({ project }: { project: string }) {
    const result = await findOrphanedOriginals({ project })

    if (!result.success) {
        return <div className="text-red-500">Failed to load orphaned files</div>
    }

    const { orphans } = result.payload

    if (orphans.length === 0) {
        return <div className="text-accent">No orphaned files found</div>
    }

    return <>
        <section className="text-accent">
            <span>{orphans.length} orphaned file(s)</span>
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {orphans.map(fileName => (
                <OrphanCard key={fileName} project={project} fileName={fileName} />
            ))}
        </section>
    </>
}

function OrphanCard({ project, fileName }: { project: string, fileName: string }) {
    const src = variantSrc({
        variantName: variantFileName({ originalName: fileName }),
        project,
    })

    return (
        <div className="border border-gray-200 p-2">
            <div className="h-32 relative">
                <Image
                    src={src}
                    unoptimized
                    alt={fileName}
                    fill
                    style={{ objectFit: 'contain' }}
                />
            </div>
            <div className="mt-2">
                <div className="text-sm font-mono truncate text-gray-500">{fileName}</div>
            </div>
        </div>
    )
}
