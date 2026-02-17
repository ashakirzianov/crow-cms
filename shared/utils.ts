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

