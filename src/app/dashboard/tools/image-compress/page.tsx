"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  FileImage,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Play,
  Pause
} from "lucide-react"
import { toast } from "sonner"

interface ImageFile {
  id: string
  file: File
  name: string
  size: number
  compressedSize?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  downloadUrl?: string
}

export default function ImageCompressToolPage() {
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [results, setResults] = useState<Record<string, CompressionResult>>({})

  // File drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    addFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    )

    addFiles(files)
    // Reset input
    e.target.value = ''
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }))

    setSelectedFiles(prev => [...prev, ...newImages])
  }, [])

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id))
    setSelectedFiles(prev => prev.map(file =>
      file.id === id ? { ...file, status: 'pending', progress: 0, error: undefined } : file
    ))
  }, [])

  const compressImages = useCallback(async () => {
    if (selectedFiles.length === 0 || isCompressing) return

    setIsCompressing(true)
    setOverallProgress(0)
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending')

    let completedCount = selectedFiles.filter(f => f.status === 'completed').length

    for (let i = 0; i < pendingFiles.length; i++) {
      const imageFile = pendingFiles[i]

      // Update file status to processing
      setSelectedFiles(prev => prev.map(f =>
        f.id === imageFile.id ? { ...f, status: 'processing' } : f
      ))

      try {
        const formData = new FormData()
        formData.append('image', imageFile.file)

        // Simulate progress updates (in real implementation, this would be WebSocket or polling)
        const progressInterval = setInterval(() => {
          setSelectedFiles(prev => prev.map(f =>
            f.id === imageFile.id && f.progress < 90
              ? { ...f, progress: f.progress + Math.random() * 20 }
              : f
          ))
        }, 200)

        const response = await fetch('/api/tools/image-compress', {
          method: 'POST',
          body: formData
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        // Update file with result
        setSelectedFiles(prev => prev.map(f =>
          f.id === imageFile.id ? {
            ...f,
            status: 'completed',
            progress: 100,
            compressedSize: result.compressedSize
          } : f
        ))

        // Add to results
        setResults(prev => ({
          ...prev,
          [imageFile.id]: {
            originalSize: imageFile.size,
            compressedSize: result.compressedSize,
            compressionRatio: ((imageFile.size - result.compressedSize) / imageFile.size) * 100,
            downloadUrl: `/api/files/${result.filePath}`
          }
        }))

        completedCount++
        setOverallProgress((completedCount / selectedFiles.length) * 100)

        toast.success(`${imageFile.name} compressed successfully`)

      } catch (error: any) {
        // Update file status to failed
        setSelectedFiles(prev => prev.map(f =>
          f.id === imageFile.id ? {
            ...f,
            status: 'failed',
            progress: 0,
            error: error.message
          } : f
        ))

        console.error(`Error compressing ${imageFile.name}:`, error)
        toast.error(`Failed to compress ${imageFile.name}: ${error.message}`)
      }
    }

    setIsCompressing(false)
    setOverallProgress(100)
  }, [selectedFiles, isCompressing])

  const downloadAll = useCallback(async () => {
    if (Object.keys(results).length === 0) return

    try {
      const filePaths = Object.values(results).map(r => r.downloadUrl ? r.downloadUrl.split('/api/files/')[1] : '').filter(Boolean)

      if (filePaths.length === 0) return

      const response = await fetch('/api/tools/image-compress/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePaths })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'compressed_images.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Downloaded ${filePaths.length} compressed images as ZIP`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download ZIP file')
    }
  }, [results])

  const clearAll = useCallback(() => {
    setSelectedFiles([])
    setResults({})
    setOverallProgress(0)
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTotalSavedSpace = (): string => {
    const totalOriginal = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    const totalCompressed = Object.values(results).reduce((sum, r) => sum + r.compressedSize, 0)
    const saved = totalOriginal - totalCompressed
    if (saved <= 0) return '0 Bytes'
    return formatFileSize(saved)
  }

  const getStatusIcon = (status: ImageFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <FileImage className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: ImageFile['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Image Compress Tool</h2>
          <p className="text-muted-foreground">Compress multiple images with progress tracking</p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Images</CardTitle>
            <CardDescription>
              Add multiple images to compress them all at once. Supports PNG, JPG, and WebP formats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isCompressing
                  ? 'border-muted-foreground/50 bg-muted/50'
                  : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
                disabled={isCompressing}
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drop your images here or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports PNG, JPG, JPEG, WebP, BMP, and GIF files up to 50MB each
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Selected Images ({selectedFiles.length})</CardTitle>
                  <CardDescription>
                    Review and manage images before compression
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={compressImages}
                    disabled={isCompressing || !selectedFiles.some(f => f.status === 'pending')}
                  >
                    {isCompressing ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Compressing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Compress All
                      </>
                    )}
                  </Button>
                  {Object.keys(results).length > 0 && (
                    <Button variant="outline" onClick={downloadAll}>
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  )}
                  <Button variant="outline" onClick={clearAll} disabled={isCompressing}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Overall Progress */}
              {isCompressing && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="w-full" />
                </div>
              )}

              {/* Saved Space Summary */}
              {Object.keys(results).length > 0 && (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total space saved: <strong>{getTotalSavedSpace()}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {/* Files Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {selectedFiles.map((file) => {
                  const result = results[file.id]

                  return (
                    <Card
                      key={file.id}
                      className={`relative ${
                        file.status === 'failed' ? 'border-red-200 bg-red-50' :
                        file.status === 'completed' ? 'border-green-200 bg-green-50' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col h-full min-h-[160px]">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(file.status)}
                              {getStatusBadge(file.status)}
                            </div>
                            {!isCompressing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFile(file.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {/* File Name */}
                          <div className="mb-2">
                            <p className="text-sm font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                          </div>

                          {/* File Info */}
                          <div className="flex-1 mb-2">
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>Original: {formatFileSize(file.size)}</div>
                              {result && (
                                <div className="space-y-1">
                                  <div>Compressed: {formatFileSize(result.compressedSize)}</div>
                                  <div className="text-green-600 font-medium">
                                    -{result.compressionRatio.toFixed(1)}% saved
                                  </div>
                                </div>
                              )}
                              {file.error && (
                                <div className="text-red-600 font-medium truncate" title={file.error}>
                                  {file.error}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {(file.status === 'processing' || file.progress > 0) && file.progress < 100 && (
                            <div className="mt-2">
                              <Progress value={file.progress} className="w-full h-2 mb-1" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(file.progress)}%
                              </span>
                            </div>
                          )}

                          {/* Individual Download */}
                          {result?.downloadUrl && selectedFiles.length <= 10 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => window.open(result.downloadUrl, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">1. Upload Images</p>
                <p>Drag & drop or select multiple images</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">2. Compress</p>
                <p>Automatic compression with progress tracking</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">3. Download</p>
                <p>Get compressed images individually or as batch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
