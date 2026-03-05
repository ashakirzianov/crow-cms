'use client'

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/shared/Atoms"
import { variantSrc, variantFileName } from "@/shared/variants"
import { deleteOrphan, findDuplicateOriginals, DuplicateFile } from "./workers"
import { hrefForConsole } from "@/shared/href"

type DuplicateState =
    | { status: 'idle' }
    | { status: 'found', duplicates: DuplicateFile[] }
    | { status: 'error' }

export default function OrphanAside({ project, fileName }: { project: string, fileName: string }) {
    const router = useRouter()
    const [isDeleting, startDeleteTransition] = useTransition()
    const [isChecking, startCheckTransition] = useTransition()
    const [duplicates, setDuplicates] = useState<DuplicateState>({ status: 'idle' })

    function handleDelete() {
        startDeleteTransition(async () => {
            await deleteOrphan({ project, fileName })
            router.push(hrefForConsole({ project, action: 'orphans' }))
            router.refresh()
        })
    }

    function handleCheckDuplicates() {
        startCheckTransition(async () => {
            const result = await findDuplicateOriginals({ project, fileName })
            setDuplicates(result.success
                ? { status: 'found', duplicates: result.payload.duplicates }
                : { status: 'error' }
            )
        })
    }

    const src = variantSrc({
        variantName: variantFileName({ originalName: fileName }),
        project,
    })
    const isWorking = isDeleting || isChecking

    return (
        <div className="flex flex-col gap-4">
            <div className="relative h-64 w-full">
                <Image src={src} unoptimized alt={fileName} fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="font-mono text-sm break-all text-gray-600">{fileName}</div>
            <div className="flex gap-2">
                <Button
                    text={isChecking ? 'Checking...' : 'Check duplicates'}
                    kind="gray"
                    disabled={isWorking}
                    onClick={handleCheckDuplicates}
                />
                <Button
                    text={isDeleting ? 'Deleting...' : 'Delete'}
                    disabled={isWorking}
                    onClick={handleDelete}
                />
            </div>
            {duplicates.status === 'found' && (
                <div className="text-sm">
                    {duplicates.duplicates.length === 0
                        ? <span className="text-gray-500">No duplicates found</span>
                        : <>
                            <div className="text-gray-500 mb-1">Duplicate files ({duplicates.duplicates.length}):</div>
                            <ul className="flex flex-col gap-1">
                                {duplicates.duplicates.map(({ fileName: dupName, assetId }) => (
                                    <li key={dupName} className="font-mono text-xs break-all bg-gray-50 px-2 py-1 rounded flex flex-col gap-0.5">
                                        <span>{dupName}</span>
                                        {assetId
                                            ? <Link
                                                href={hrefForConsole({ project, assetId })}
                                                className="text-accent hover:underline not-italic normal-case"
                                            >
                                                asset: {assetId}
                                            </Link>
                                            : <span className="text-gray-400">orphan</span>
                                        }
                                    </li>
                                ))}
                            </ul>
                        </>
                    }
                </div>
            )}
            {duplicates.status === 'error' && (
                <div className="text-sm text-red-500">Failed to check for duplicates</div>
            )}
        </div>
    )
}
