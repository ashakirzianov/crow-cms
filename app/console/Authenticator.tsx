import { Button } from "@/shared/Atoms"
import { authenticate } from "@/shared/auth"
import { redirect } from "next/navigation"

export async function Authenticator() {
    const handleSubmit = async (formData: FormData) => {
        'use server'
        const password = formData.get('password') as string
        const success = await authenticate(password)
        if (success) {
            // Revalidate the page to show the console
            redirect('/console')
        }
    }

    return (
        <form action={handleSubmit} className="flex flex-col items-center justify-center h-screen">
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