import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/shared/auth'
import { generateUploadTarget } from '@/shared/fileStore'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ project: string }> },
) {
    const { project } = await params

    if (!await isAuthorized(project)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName, contentType } = await request.json()
    if (!fileName || !contentType) {
        return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 })
    }

    if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 })
    }

    const result = await generateUploadTarget({ project, fileName, contentType })
    if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
        presignedUrl: result.presignedUrl,
        fileName: result.fileName,
    })
}
