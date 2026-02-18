'use client'
import { Button } from "@/shared/Atoms"
import { normalizeOrder, generateDefaultVariants } from "./workers"
import { useActionState } from "react"

export default function WorkersPane({ project }: { project: string }) {
    return <section>
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
    </section>
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