'use client'
import { UploadProgress } from "@/shared/fileStore"
import { useRef, useState } from "react"
import { Button } from "@/shared/Atoms"
import { hrefForConsole } from "@/shared/href"
import Link from "next/link"

export default function FileUploader({ project }: { project: string }) {
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'complete'>('idle')
    const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
    const fileInputRef = useRef<HTMLInputElement>(null)

    const totalFiles = uploadProgress.size
    const completedFiles = Array.from(uploadProgress.values()).filter(p => p.status === 'success').length
    const failedFiles = Array.from(uploadProgress.values()).filter(p => p.status === 'error').length

    const handleFileSelect = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploadState('uploading')
        const newProgressMap = new Map<string, UploadProgress>()
        Array.from(files).forEach(file => {
            newProgressMap.set(file.name, { fileName: file.name, progress: 0, status: 'pending' })
        })
        setUploadProgress(newProgressMap)

        for (const file of Array.from(files)) {
            setUploadProgress(prev => {
                const next = new Map(prev)
                next.set(file.name, { fileName: file.name, progress: 0, status: 'uploading' })
                return next
            })

            try {
                const { assetId } = await uploadFile(file, project, (progress) => {
                    setUploadProgress(prev => {
                        const next = new Map(prev)
                        next.set(file.name, { fileName: file.name, progress, status: 'uploading' })
                        return next
                    })
                })
                setUploadProgress(prev => {
                    const next = new Map(prev)
                    next.set(file.name, { fileName: file.name, progress: 100, status: 'success', assetId })
                    return next
                })
            } catch (error) {
                setUploadProgress(prev => {
                    const next = new Map(prev)
                    next.set(file.name, {
                        fileName: file.name,
                        progress: 100,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    })
                    return next
                })
            }
        }

        setUploadState('complete')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const resetUpload = () => {
        setUploadState('idle')
        setUploadProgress(new Map())
    }

    return (
        <div className="mb-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif"
                multiple
            />

            {uploadState === 'idle' && (
                <Button
                    onClick={handleFileSelect}
                    text="Upload Assets"
                />
            )}

            {uploadState !== 'idle' && (
                <div>
                    <div className="flex justify-between mb-2">
                        <h3 className="font-medium">Uploading Assets</h3>
                        <div className="text-sm text-gray-500">
                            {completedFiles}/{totalFiles} complete
                            {failedFiles > 0 && ` (${failedFiles} failed)`}
                        </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div
                            className="bg-accent h-2.5 rounded-full"
                            style={{ width: `${Math.floor((completedFiles / totalFiles) * 100)}%` }}
                        ></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 max-h-80 overflow-y-auto">
                        {Array.from(uploadProgress).map(([fileName, progress]) => (
                            <div key={fileName} className="border rounded-md p-3">
                                <div className="flex justify-between mb-1">
                                    <div className="text-sm font-medium truncate" title={fileName}>
                                        {fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName}
                                    </div>
                                    <div className="text-xs">
                                        {progress.status === 'pending' && 'Pending'}
                                        {progress.status === 'uploading' && `${progress.progress}%`}
                                        {progress.status === 'success' && 'Complete'}
                                        {progress.status === 'error' && 'Failed'}
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                    <div
                                        className={`h-1.5 rounded-full ${progress.status === 'error'
                                            ? 'bg-red-500'
                                            : progress.status === 'success'
                                                ? 'bg-green-500'
                                                : 'bg-accent'
                                            }`}
                                        style={{ width: `${progress.progress}%` }}
                                    ></div>
                                </div>
                                {progress.status === 'success' && progress.assetId && (
                                    <Link
                                        href={hrefForConsole({ project, assetId: progress.assetId })}
                                        className="text-xs text-accent underline truncate block"
                                        title={progress.assetId}
                                    >
                                        {progress.assetId}
                                    </Link>
                                )}
                                {progress.status === 'error' && progress.error && (
                                    <div className="text-xs text-red-500 truncate" title={progress.error}>
                                        {progress.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end space-x-3">
                        {uploadState === 'complete' && (
                            <Button text="Reset" onClick={resetUpload} kind="gray" />
                        )}
                        <Button
                            text={uploadState === 'complete' ? 'Upload More' : 'Add Files'}
                            onClick={handleFileSelect}
                            disabled={uploadState === 'uploading'}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

async function uploadFile(
    file: File,
    project: string,
    onProgress: (pct: number) => void,
): Promise<{ assetId: string }> {
    // Step 1: Get presigned URL from server
    const presignRes = await fetch(`/api/projects/${project}/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    })
    if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.error ?? 'Failed to get upload URL')
    }
    const { presignedUrl, fileName } = await presignRes.json()

    // Step 2: Upload directly to S3 using XHR for real progress
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                // Map S3 upload progress to 0–90%
                onProgress(Math.round((e.loaded / e.total) * 90))
            }
        })
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve()
            } else {
                reject(new Error(`S3 upload failed with status ${xhr.status}`))
            }
        })
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
    })

    // Step 3: Notify server to process the uploaded file
    onProgress(95)
    const confirmRes = await fetch(`/api/projects/${project}/upload/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
    })
    if (!confirmRes.ok) {
        const data = await confirmRes.json()
        throw new Error(data.error ?? 'Failed to confirm upload')
    }
    const { assetId } = await confirmRes.json()
    return { assetId }
}
