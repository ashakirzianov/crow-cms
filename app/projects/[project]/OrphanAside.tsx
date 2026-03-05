'use client'

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/shared/Atoms"
import { variantSrc, variantFileName } from "@/shared/variants"
import { deleteOrphan } from "./workers"
import { hrefForConsole } from "@/shared/href"

export default function OrphanAside({ project, fileName }: { project: string, fileName: string }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        startTransition(async () => {
            await deleteOrphan({ project, fileName })
            router.push(hrefForConsole({ project, action: 'orphans' }))
            router.refresh()
        })
    }

    const src = variantSrc({
        variantName: variantFileName({ originalName: fileName }),
        project,
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="relative h-64 w-full">
                <Image src={src} unoptimized alt={fileName} fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="font-mono text-sm break-all text-gray-600">{fileName}</div>
            <Button
                text={isPending ? 'Deleting...' : 'Delete'}
                disabled={isPending}
                onClick={handleDelete}
            />
        </div>
    )
}
