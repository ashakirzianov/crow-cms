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