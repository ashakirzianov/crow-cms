export function findDuplicates<T>(arr: T[], comparator: (a: T, b: T) => boolean): T[] {
    const duplicates: T[] = []
    const seen: T[] = []

    arr.forEach((item) => {
        if (seen.some((seenItem) => comparator(item, seenItem))) {
            duplicates.push(item)
        } else {
            seen.push(item)
        }
    })

    return duplicates
}

export function unique<T>(arr: T[], comparator: (a: T, b: T) => boolean): T[] {
    const seen: T[] = []

    arr.forEach((item) => {
        if (!seen.some((seenItem) => comparator(item, seenItem))) {
            seen.push(item)
        }
    })

    return seen
}

export function filterOutUndefined<T>(array: (T | undefined)[]): T[] {
    return array.filter((item): item is T => item !== undefined)
}

export function asserNever(query: never): never {
    return query
}

export type Lazy<T> = () => T
export function lazy<T>(fn: () => T): Lazy<T> {
    let cached: T | undefined = undefined
    return () => {
        if (cached === undefined) {
            cached = fn()
        }
        return cached
    }
}

export function makeBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize))
    }
    return batches
}

