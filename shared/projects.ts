export type ProjectConfig = {
    users: string[],
    secret: string,
    makeExternalLink?(assetId: string): string,
    revalidateAsset?(assetId: string): Promise<boolean>,
    revalidateAssetIndex?(): Promise<boolean>,
}

export function getProjectConfig(project: string): ProjectConfig | undefined {
    return projects[project]
}

const projects: Record<string, ProjectConfig> = {
    alikro: makeAlikroConfig(),
}

function makeAlikroConfig(): ProjectConfig {
    const domain = process.env.ALIKRO_DOMAIN ?? 'alikro.art'
    async function revalidateTag(tag: string) {
        try {
            // Call https://{domain}/api/revalidate/{tag} to revalidate the tag
            const res = await fetch(`https://${domain}/api/revalidate/${tag}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.ALIKRO_SECRET_KEY ?? 'alikro'}`,
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
        users: ['alikro', 'ashakirzianov'],
        secret: process.env.ALIKRO_SECRET_KEY ?? 'alikro',
        makeExternalLink(assetId: string) {
            return `https://${domain}/all/${assetId}`
        },
        async revalidateAsset(assetId: string) {
            return revalidateTag(`asset:${assetId}`)
        },
        async revalidateAssetIndex() {
            return revalidateTag(`assets:index`)
        },
    }
}