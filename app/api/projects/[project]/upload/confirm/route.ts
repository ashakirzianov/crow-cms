import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/shared/auth'
import { confirmUploadedAsset } from '@/shared/fileStore'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ project: string }> },
) {
    const { project } = await params

    if (!await isAuthorized(project)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName } = await request.json()
    if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
    }

    const result = await confirmUploadedAsset({ project, fileName })
    if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({ assetId: result.assetId })
}
