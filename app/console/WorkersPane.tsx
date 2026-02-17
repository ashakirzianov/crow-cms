'use client'
import { Button } from "@/shared/Atoms"
import { normalizeOrder } from "./workers"
import { useActionState } from "react"

export default function WorkersPane() {
    return <section>
        <WorkerButton
            title="Normalize Order"
            action={normalizeOrder}
        />
    </section>
}

function WorkerButton({ title, action }: {
    title: string,
    action: () => Promise<boolean>
}) {
    async function handleAction(): Promise<ActionState> {
        const result = await action()
        if (result) {
            return 'success'
        } else {
            return 'error'
        }
    }
    type ActionState = 'idle' | 'success' | 'error'
    const [state, formAction, isPending] = useActionState<ActionState>(handleAction, 'idle')
    return <form action={formAction} className="flex flex-row items-center gap-4">
        <label>{title}</label>
        <Button
            type="submit"
            text={isPending ? 'Pending...' : state === 'success' ? 'Success!' : state === 'error' ? 'Error!' : 'Run'}
            disabled={isPending}
        />
    </form>
}