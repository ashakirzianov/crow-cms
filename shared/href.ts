export function hrefForConsole({
    project,
    filter, action, assetId
}: {
    project: string,
    filter?: string,
    action?: string,
    assetId?: string,
}): string {
    const searchParams = new URLSearchParams()
    if (filter) {
        searchParams.set('filter', filter)
    }
    if (assetId) {
        searchParams.set('aside', `edit:${assetId}`)
    } else if (action) {
        searchParams.set('aside', action)
    }
    return searchParams.size === 0
        ? `/projects/${project}`
        : `/projects/${project}?${searchParams.toString()}`
}