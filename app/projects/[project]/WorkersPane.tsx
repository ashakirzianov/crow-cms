'use client'
import { Button } from "@/shared/Atoms"
import { normalizeOrder, generateDefaultVariants, prettifyAllIds, replaceAllValues } from "./workers"
import { useActionState, useRef } from "react"

export default function WorkersPane({ project }: { project: string }) {
    return <section className="flex flex-wrap gap-4 items-center">
        <WorkerButton
            title="Prettify All IDs"
            project={project}
            action={prettifyAllIds}
        />
        <WorkerButton
            title="Normalize Order"
            project={project}
            action={normalizeOrder}
        />
        <WorkerButton
            title="Generate Default Variants"
            project={project}
            action={generateDefaultVariants}
        />
        <ReplaceMaterialWorker project={project} />
    </section>
}

function ReplaceMaterialWorker({ project }: { project: string }) {
    const toReplaceRef = useRef<HTMLInputElement>(null)
    const replaceWithRef = useRef<HTMLInputElement>(null)

    type ActionState = { state: 'idle' } | { state: 'success', replaced: number } | { state: 'error' }
    async function handleAction(): Promise<ActionState> {
        const toReplace = toReplaceRef.current?.value ?? ''
        const replaceWith = replaceWithRef.current?.value ?? ''
        const result = await replaceAllValues({ project, property: 'material', toReplace, replaceWith })
        return result.success
            ? { state: 'success', replaced: result.payload.replaced }
            : { state: 'error' }
    }
    const [state, formAction, isPending] = useActionState<ActionState>(handleAction, { state: 'idle' })

    const buttonText = isPending ? 'Pending...'
        : state.state === 'success' ? `Success! Replaced ${state.replaced}`
            : state.state === 'error' ? 'Error!'
                : 'Replace all materials'

    return <form action={formAction} className="flex flex-wrap items-center gap-4">
        <input ref={toReplaceRef} type="text" placeholder="Replace material" className="border rounded px-2 py-1" />
        <input ref={replaceWithRef} type="text" placeholder="With material" className="border rounded px-2 py-1" />
        <Button type="submit" text={buttonText} disabled={isPending} />
    </form>
}

function WorkerButton<T>({ title, action, project }: {
    project: string,
    title: string,
    action: (payload: { project: string }) => Promise<{
        success: boolean,
        payload: T,
    }>
}) {
    async function handleAction(): Promise<ActionState> {
        const result = await action({ project })
        if (result.success) {
            return {
                state: 'success',
                payload: result.payload,
            }
        } else {
            return {
                state: 'error',
                payload: result.payload,
            }
        }
    }
    type ActionState = { state: 'idle' } | {
        state: 'success',
        payload: T,
    } | {
        state: 'error',
        payload: T,
    }
    const [state, formAction, isPending] = useActionState<ActionState>(handleAction, { state: 'idle' })
    function payloadToMessage(payload: T): string {
        return JSON.stringify(payload)
    }
    const text = isPending ? 'Pending...'
        : state.state === 'success' ? `Success! ${payloadToMessage(state.payload)}`
            : state.state === 'error' ? `Error! ${payloadToMessage(state.payload)}`
                : 'Run'
    return <form action={formAction} className="flex flex-row items-center gap-4">
        <label>{title}</label>
        <Button
            type="submit"
            text={text}
            disabled={isPending}
        />
    </form>
}