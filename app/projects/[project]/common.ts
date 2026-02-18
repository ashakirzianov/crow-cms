import { z } from 'zod'

const AssetUpdateSchema = z.object({
    id: z.string(),
    kind: z.string().optional(),
    title: z.string().optional(),
    year: z.number().optional(),
    material: z.string().optional(),
    tags: z.string().array().optional(),
    order: z.number().optional(),
})
const AssetUpdatesSchema = z.array(AssetUpdateSchema)
export function parseAssetUpdates(data: unknown) {
    try {
        if (typeof data !== 'string') {
            throw new Error('Invalid JSON')
        }
        const parsed = JSON.parse(data)
        return AssetUpdatesSchema.safeParse(parsed)
    } catch {
        return AssetUpdatesSchema.safeParse('Invalid JSON')
    }
}

const AssetCreateSchema = z.object({
    id: z.string(),
    fileName: z.string(),
    uploaded: z.number(),
    width: z.number(),
    height: z.number(),
    kind: z.string().optional(),
    title: z.string().optional(),
    year: z.number().optional(),
    material: z.string().optional(),
    tags: z.string().array().optional(),
    order: z.number().optional(),
})
const AssetCreatesSchema = z.array(AssetCreateSchema)
export function parseAssetCreates(data: unknown) {
    try {
        if (typeof data !== 'string') {
            throw new Error('Invalid JSON')
        }
        const parsed = JSON.parse(data)
        return AssetCreatesSchema.safeParse(parsed)
    } catch {
        return AssetCreatesSchema.safeParse('Invalid JSON')
    }
}