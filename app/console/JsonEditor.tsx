'use client'

import { useActionState, useEffect, useState } from "react"
import { Button } from "@/shared/Atoms"
import { handleJsonEdit } from "./actions"
import { parseAssetUpdates } from "./common"

export function JsonEditor({ initialJson }: {
    initialJson: string,
}) {
    const [text, setText] = useState(initialJson)
    const [state, formAction, isPending] = useActionState(handleJsonEdit, {
        success: true,
    })
    useEffect(() => {
        setText(initialJson)
    }, [initialJson])

    return <form action={formAction}>
        <header className="flex flex-col gap-4">
            <nav className="flex flex-row gap-4">
                <Button type="submit" name="intent" value="save" disabled={isPending} text="Save" />
                <CopyButton text={text} />
            </nav>
            {!state.success
                ? <p className="text-red-500">{state.message}</p>
                : null
            }
            {state.success && state.saved && <p className="text-green-500">Successfully saveded assets</p>}
        </header>
        <main>
            <textarea name="json" rows={10} className="w-full h-full p-2 border rounded" value={text}
                onChange={(e) => {
                    setText(e.target.value)
                }}
            />
        </main>
    </form >

}

function CopyButton({ text }: {
    text: string,
}) {
    const [state, setState] = useState('idle')
    function handleCopy() {
        setState('pending')
        const parsed = parseAssetUpdates(text)
        if (!parsed.success) {
            setState('error')
            console.error('Failed to parse JSON: ', parsed.error)
            console.error('JSON: ', text)
            setTimeout(() => {
                setState('idle')
            }, 2000)
            return
        }
        navigator.clipboard.writeText(text).then(() => {
            setState('success')
            setTimeout(() => {
                setState('idle')
            }, 2000)
        }).catch((err) => {
            setState('error')
            console.error('Failed to copy: ', err)
            setTimeout(() => {
                setState('idle')
            }, 2000)
        })
    }

    return <Button
        type="button"
        onClick={handleCopy}
        disabled={state === 'pending'}
        text={
            state === 'pending' ? 'Copying...'
                : state === 'success' ? 'Copied!'
                    : state === 'error' ? 'Error!'
                        : 'Copy JSON'
        }
    />
}