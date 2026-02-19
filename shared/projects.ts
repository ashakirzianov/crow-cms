export type ProjectConfig = {
    title: string,
    users: string[],
    secret: string,
    makeExternalLink?(assetId: string): string,
    revalidateTagHook?(tag: string): Promise<boolean>,
}

export function getProjectConfig(project: string): ProjectConfig | undefined {
    return projects[project]
}

export function getAllProjects(): string[] {
    return Object.keys(projects)
}

const projects: Record<string, ProjectConfig> = {
    alikro: makeAlikroConfig(),
}

function makeAlikroConfig(): ProjectConfig {
    const baseUrl = process.env.ALIKRO_URL ?? 'http://localhost:3000'
    async function revalidateTagHook(tag: string) {
        try {
            const Authorization = `Bearer ${process.env.ALIKRO_SECRET_KEY ?? 'alikro'}`
            // Call {baseUrl}/api/revalidate/{tag} to revalidate the tag
            const res = await fetch(`${baseUrl}/api/revalidate/${tag}`, {
                method: 'POST',
                headers: {
                    Authorization,
                }
            })
            if (!res.ok) {
                console.error(`Failed to revalidate tag "${tag}". Status: ${res.status}, Response: ${await res.text()}`)
                return false
            }
            return true
        } catch (error) {
            console.error('Error revalidating tag:', error)
            return false
        }
    }
    return {
        title: 'Alikro',
        users: ['alikro', 'ashakirzianov'],
        secret: process.env.ALIKRO_SECRET_KEY ?? 'alikro',
        makeExternalLink(assetId: string) {
            return `${baseUrl}/all/${assetId}`
        },
        revalidateTagHook,
    }
}