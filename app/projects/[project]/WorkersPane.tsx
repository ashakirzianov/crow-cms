'use client'
import { Button } from "@/shared/Atoms"
import { normalizeOrder, generateDefaultVariants, prettifyAllIds, replaceAllValues, replaceTag, findOrphanedOriginals, findOrphanedVariants } from "./workers"
import { useRef, useState, useTransition } from "react"

export default function WorkersPane({ project }: { project: string }) {
    const [output, setOutput] = useState<{ kind: 'success' | 'error', message: string } | null>(null)
    const [isWorking, setIsWorking] = useState(false)

    function onStart() {
        setOutput(null)
        setIsWorking(true)
    }
    function onFinish(result: { kind: 'success' | 'error', message: string }) {
        setOutput(result)
        setIsWorking(false)
    }

    return <section className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center">
            <WorkerButton
                title="Prettify All IDs"
                project={project}
                action={prettifyAllIds}
                disabled={isWorking}
                onStart={onStart}
                onFinish={onFinish}
            />
            <WorkerButton
                title="Normalize Order"
                project={project}
                action={normalizeOrder}
                disabled={isWorking}
                onStart={onStart}
                onFinish={onFinish}
            />
            <WorkerButton
                title="Generate Default Variants"
                project={project}
                action={generateDefaultVariants}
                disabled={isWorking}
                onStart={onStart}
                onFinish={onFinish}
            />
            <WorkerButton
                title="Find Orphaned Variants"
                project={project}
                action={findOrphanedVariants}
                disabled={isWorking}
                onStart={onStart}
                onFinish={onFinish}
                payloadToMessage={({ orphans }) => {
                    if (orphans.length === 0) return 'No orphaned variants found'
                    const originals = Array.from(new Set(orphans.map(v => {
                        const lastAt = v.lastIndexOf('@')
                        return lastAt !== -1 ? v.substring(0, lastAt) : v
                    })))
                    return `Found ${orphans.length} orphaned variant(s) from ${originals.length} original(s):\n${originals.map(o => `  ${o}`).join('\n')}`
                }}
            />
            <WorkerButton
                title="Find Orphaned Originals"
                project={project}
                action={findOrphanedOriginals}
                disabled={isWorking}
                onStart={onStart}
                onFinish={onFinish}
                payloadToMessage={({ orphans }) => orphans.length === 0
                    ? 'No orphaned files found'
                    : `Found ${orphans.length} orphaned file(s):\n${orphans.map(f => `  ${f}`).join('\n')}`
                }
            />
            <ReplaceMaterialWorker project={project} disabled={isWorking} onStart={onStart} onFinish={onFinish} />
            <ReplaceTagWorker project={project} disabled={isWorking} onStart={onStart} onFinish={onFinish} />
        </div>
        {output && (
            <div className={`px-4 py-2 rounded-md text-sm font-mono whitespace-pre-wrap ${output.kind === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {output.message}
            </div>
        )}
    </section>
}

type WorkerCallbacks = {
    disabled: boolean
    onStart: () => void
    onFinish: (result: { kind: 'success' | 'error', message: string }) => void
}

function ReplaceMaterialWorker({ project, disabled, onStart, onFinish }: { project: string } & WorkerCallbacks) {
    const toReplaceRef = useRef<HTMLInputElement>(null)
    const replaceWithRef = useRef<HTMLInputElement>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const toReplace = toReplaceRef.current?.value ?? ''
        const replaceWith = replaceWithRef.current?.value ?? ''
        onStart()
        startTransition(async () => {
            const result = await replaceAllValues({ project, property: 'material', toReplace, replaceWith })
            onFinish(result.success
                ? { kind: 'success', message: `Replaced ${result.payload.replaced} material(s)` }
                : { kind: 'error', message: 'Failed to replace materials' }
            )
        })
    }

    return <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4">
        <input ref={toReplaceRef} type="text" placeholder="Replace material" className="border rounded px-2 py-1" />
        <input ref={replaceWithRef} type="text" placeholder="With material" className="border rounded px-2 py-1" />
        <Button type="submit" text={isPending ? 'Working...' : 'Replace all materials'} disabled={disabled || isPending} />
    </form>
}

function ReplaceTagWorker({ project, disabled, onStart, onFinish }: { project: string } & WorkerCallbacks) {
    const toReplaceRef = useRef<HTMLInputElement>(null)
    const replaceWithRef = useRef<HTMLInputElement>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const toReplace = toReplaceRef.current?.value ?? ''
        const replaceWith = replaceWithRef.current?.value ?? ''
        onStart()
        startTransition(async () => {
            const result = await replaceTag({ project, toReplace, replaceWith })
            onFinish(result.success
                ? { kind: 'success', message: `Replaced ${result.payload.replaced} tag(s)` }
                : { kind: 'error', message: 'Failed to replace tags' }
            )
        })
    }

    return <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4">
        <input ref={toReplaceRef} type="text" placeholder="Replace tag" className="border rounded px-2 py-1" />
        <input ref={replaceWithRef} type="text" placeholder="With tag" className="border rounded px-2 py-1" />
        <Button type="submit" text={isPending ? 'Working...' : 'Replace all tags'} disabled={disabled || isPending} />
    </form>
}

function WorkerButton<T>({ title, action, project, disabled, onStart, onFinish, payloadToMessage }: {
    project: string,
    title: string,
    action: (payload: { project: string }) => Promise<{ success: boolean, payload: T }>
    payloadToMessage?: (payload: T) => string,
} & WorkerCallbacks) {
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        onStart()
        startTransition(async () => {
            const result = await action({ project })
            const message = payloadToMessage ? payloadToMessage(result.payload) : JSON.stringify(result.payload)
            onFinish({ kind: result.success ? 'success' : 'error', message })
        })
    }

    return <form onSubmit={handleSubmit} className="flex flex-row items-center gap-4">
        <label>{title}</label>
        <Button
            type="submit"
            text={isPending ? 'Working...' : 'Run'}
            disabled={disabled || isPending}
        />
    </form>
}