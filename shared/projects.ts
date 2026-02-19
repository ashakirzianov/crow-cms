export type ProjectConfig = {
    users: string[],
    secret: string,
    makeExternalLink?(assetId: string): string,
}

export function getProjectConfig(project: string): ProjectConfig | undefined {
    return projects[project]
}

const projects: Record<string, ProjectConfig> = {
    alikro: makeAlikroConfig(),
}

function makeAlikroConfig(): ProjectConfig {
    const domain = process.env.ALIKRO_DOMAIN ?? 'alikro.art'
    return {
        users: ['alikro', 'ashakirzianov'],
        secret: process.env.ALIKRO_SECRET_KEY ?? 'alikro',
        makeExternalLink(assetId: string) {
            return `https://${domain}/all/${assetId}`
        }
    }
}