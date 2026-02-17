import { Button } from "@/shared/Atoms"
import { authenticate } from "@/shared/auth"
import { hrefForConsole } from "@/shared/href"
import { redirect } from "next/navigation"

export async function Authenticator({ project }: { project: string }) {
    const handleSubmit = async (formData: FormData) => {
        'use server'
        const username = formData.get('username') as string
        const password = formData.get('password') as string
        const success = await authenticate(username, password)
        if (success) {
            // Revalidate the page to show the console
            redirect(hrefForConsole({ project }))
        }
    }

    return (
        <form action={handleSubmit} className="flex flex-col items-center justify-center h-screen">
            <input
                type="text"
                name="username"
                placeholder="Enter username"
                className="mb-4 p-2 border border-accent rounded"
                autoComplete="username"
            />
            <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="mb-4 p-2 border border-accent rounded"
                autoComplete="current-password"
            />
            <Button
                type="submit"
                text="Sign In"
            />
        </form>
    )
}