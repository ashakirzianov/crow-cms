export function hrefForConsole({
    filter, action, assetId
}: {
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
        ? '/console'
        : `/console?${searchParams.toString()}`
}