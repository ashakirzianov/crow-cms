'use server'
import { AssetKind, parseTagsString, AssetMetadata } from "@/shared/assets"
import { isAuthorized } from "@/shared/auth"
import { parseAssetCreates, parseAssetUpdates } from "@/app/projects/[project]/common"
import {
    updateAsset as updateAssetOp,
    deleteAsset as deleteAssetOp,
    createAssets,
    batchUpdateAssets,
} from "@/shared/operations"

export async function updateAsset({
    project, id, formData,
}: {
    project: string,
    id: string,
    formData: FormData,
}): Promise<{ success: boolean, message: string, asset?: AssetMetadata }> {
    if (!await isAuthorized(project)) {
        return { success: false, message: 'Unauthorized' }
    }

    const update = {
        id,
        title: (formData.get('title') as string | null)?.trim() || undefined,
        year: formData.get('year') ? Number(formData.get('year')) : undefined,
        material: (formData.get('material') as string | null)?.trim() || undefined,
        kind: (() => {
            const customKind = (formData.get('customKind') as string)?.trim()
            return (customKind || formData.get('kind') as string || undefined) as AssetKind | undefined
        })(),
        order: (() => {
            const v = formData.get('order')
            return v === null ? undefined : v === '' ? undefined : Number(v)
        })(),
        tags: parseTagsString(formData.get('tags') as string),
    }

    try {
        const result = await updateAssetOp({ project, update })
        return {
            success: result.success,
            message: result.success ? 'Asset updated successfully' : result.message,
            asset: result.success ? (result.asset ?? undefined) : undefined,
        }
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
}

export async function deleteAsset({
    project, id
}: {
    project: string,
    id: string
}): Promise<{ success: boolean, message: string }> {
    if (!await isAuthorized(project)) {
        return { success: false, message: 'Unauthorized' }
    }
    try {
        const result = await deleteAssetOp({ project, id })
        return { success: result.success, message: result.message ?? '' }
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
}

export type HandleJsonEditState = {
    success: boolean,
    message?: string,
    saved?: boolean,
}
export async function handleJsonEdit(_prevState: HandleJsonEditState, formData: FormData): Promise<HandleJsonEditState> {
    const project = formData.get('project') as string
    if (!await isAuthorized(project)) {
        return { success: false, message: 'Unauthorized' }
    }
    const intent = formData.get('intent')
    if (intent === 'create') {
        return handleJsonCreate(project, formData)
    } else if (intent === 'update') {
        return handleJsonUpdate(project, formData)
    } else {
        return { success: false, message: 'Invalid intent' }
    }
}

async function handleJsonCreate(project: string, formData: FormData): Promise<HandleJsonEditState> {
    const parsed = parseAssetCreates(formData.get('json'))
    if (!parsed.success) {
        return { success: false, message: parsed.error.toString() }
    }
    try {
        await createAssets({ project, assets: parsed.data })
        return { success: true, saved: true }
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
}

async function handleJsonUpdate(project: string, formData: FormData): Promise<HandleJsonEditState> {
    const parsed = parseAssetUpdates(formData.get('json'))
    if (!parsed.success) {
        return { success: false, message: parsed.error.toString() }
    }
    try {
        const result = await batchUpdateAssets({ project, updates: parsed.data })
        return { success: result.success, saved: result.success, message: result.message }
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
}
