'use client'
import { UploadProgress } from "@/shared/fileStore"
import { useRef, useState } from "react"
import { Button } from "@/shared/Atoms"
import { uploadFile } from "./actions"

export default function FileUploader() {
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'complete'>('idle')
    const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Stats for the upload process
    const totalFiles = uploadProgress.size
    const completedFiles = Array.from(uploadProgress.values()).filter(p => p.status === 'success').length
    const failedFiles = Array.from(uploadProgress.values()).filter(p => p.status === 'error').length

    const handleFileSelect = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        // Reset the progress state
        setUploadState('uploading')
        const newProgressMap = new Map<string, UploadProgress>()

        // Initialize progress for all files
        Array.from(files).forEach(file => {
            newProgressMap.set(file.name, {
                fileName: file.name,
                progress: 0,
                status: 'pending'
            })
        })
        setUploadProgress(newProgressMap)

        // Start uploading files one by one
        for (const file of Array.from(files)) {
            try {
                // Update progress to uploading
                setUploadProgress(prev => {
                    const newMap = new Map(prev)
                    newMap.set(file.name, {
                        fileName: file.name,
                        progress: 10,
                        status: 'uploading'
                    })
                    return newMap
                })

                // Simulate progress while uploading to server
                const progressUpdateInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        const existingProgress = prev.get(file.name)
                        if (existingProgress && existingProgress.status === 'uploading' && existingProgress.progress < 90) {
                            const newMap = new Map(prev)
                            newMap.set(file.name, {
                                ...existingProgress,
                                progress: Math.min(90, existingProgress.progress + Math.floor(Math.random() * 10) + 5)
                            })
                            return newMap
                        }
                        return prev
                    })
                }, 300)

                // Create form data for the file
                const formData = new FormData()
                formData.append('file', file)

                // Upload to server using the server action
                const result = await uploadFile(formData)

                // Clear the progress interval
                clearInterval(progressUpdateInterval)

                // Update final progress based on server response
                setUploadProgress(prev => {
                    const newMap = new Map(prev)
                    if (result.success) {
                        newMap.set(file.name, {
                            fileName: file.name,
                            progress: 100,
                            status: 'success'
                        })
                    } else {
                        newMap.set(file.name, {
                            fileName: file.name,
                            progress: 100,
                            status: 'error',
                            error: result.message
                        })
                    }
                    return newMap
                })
            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error)
                // Update progress to error
                setUploadProgress(prev => {
                    const newMap = new Map(prev)
                    newMap.set(file.name, {
                        fileName: file.name,
                        progress: 100,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })
                    return newMap
                })
            }
        }

        setUploadState('complete')

        // Reset the file input
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
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif"
                multiple
            />

            {/* Upload button */}
            {uploadState === 'idle' && (
                <Button
                    onClick={handleFileSelect}
                    text="Upload Assets"
                />
            )}

            {/* Upload progress */}
            {uploadState !== 'idle' && (
                <div>
                    <div className="flex justify-between mb-2">
                        <h3 className="font-medium">Uploading Assets</h3>
                        <div className="text-sm text-gray-500">
                            {completedFiles}/{totalFiles} complete
                            {failedFiles > 0 && ` (${failedFiles} failed)`}
                        </div>
                    </div>

                    {/* Overall progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div
                            className="bg-accent h-2.5 rounded-full"
                            style={{ width: `${Math.floor((completedFiles / totalFiles) * 100)}%` }}
                        ></div>
                    </div>

                    {/* File grid */}
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

                                {/* Individual file progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
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
                            </div>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-3">
                        {uploadState === 'complete' && (
                            <Button
                                text="Reset"
                                onClick={resetUpload}
                                kind="gray"
                            />
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