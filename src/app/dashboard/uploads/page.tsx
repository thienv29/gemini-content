'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
  import {
    Upload,
    Folder,
    File,
    Trash2,
    Download,
    Plus,
    FolderOpen,
    ChevronRight,
    ChevronDown,
    ChevronsUpDown,
    MoreVertical,
    FolderPlus,
    UploadCloud,
    X,
    CheckCircle,
    List,
    Grid,
    AlignJustify,
    FileImage,
    FileVideo,
    FileAudio,
    FileText,
    FileCode,
    FileArchive,
    FileSpreadsheet,
    Search
  } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import axios from 'axios'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Spinner } from '@/components/ui/spinner'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified: string
  path: string
}

interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

type SortField = 'name' | 'type' | 'size' | 'modified'
type SortDirection = 'asc' | 'desc'

export default function UploadsPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [currentPath, setCurrentPath] = useState('/')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [droppedFolderPath, setDroppedFolderPath] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'icons'>('list')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const isInitialized = useRef(false)

  useEffect(() => {
    fetchFiles()
  }, [currentPath])

  // Handle browser back/forward navigation and initial URL hash
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const newPath = event.state?.path || '/'
      setCurrentPath(newPath)
    }

    // Handle initial path from URL hash (only once on mount)
    if (!isInitialized.current) {
      const urlHash = window.location.hash.substring(1) // Remove #
      if (urlHash && urlHash !== '/') {
        setCurrentPath(urlHash)
      }
      isInitialized.current = true
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigateToFolder = (folderPath: string) => {
    // Clean the path - ensure it starts and ends with /
    const cleanPath = folderPath.startsWith('/') ? folderPath : '/' + folderPath
    const normalizedPath = cleanPath === '/' ? '/' : cleanPath

    // Update URL without triggering navigation
    window.history.pushState({ path: normalizedPath }, '', `/dashboard/uploads#${normalizedPath}`)
    setCurrentPath(normalizedPath)
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/uploads?path=${currentPath}`)
      setFiles(response.data.files || [])
    } catch (error) {
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId)
    } else {
      newSelection.add(fileId)
    }
    setSelectedFiles(newSelection)
  }

  // Handle click with double-click detection for folders
  const handleClick = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()

    // Toggle selection for both files and folders
    toggleFileSelection(item.id)
  }

  const handleDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      // Navigate into folder on double-click
      navigateToFolder(item.path)
    } else {
      // For files, double-click could trigger download or open action
      handleDownload(item)
    }
  }

  const toggleAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderPath?: string) => {
    e.preventDefault()
    setDragOver(false)
    setDroppedFolderPath(null)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      await handleMultipleUploads(droppedFiles, targetFolderPath)
    }
  }

  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDroppedFolderPath(folderPath)
  }

  const handleFolderDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    // Check if mouse is still within the folder boundaries
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDroppedFolderPath(null)
    }
  }

  const handleMultipleUploads = async (files: File[], targetFolderPath?: string) => {
    const newUploadItems = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending' as const
    }))

    setUploadItems(prev => [...prev, ...newUploadItems])

    for (const item of newUploadItems) {
      await uploadFileItem(item, targetFolderPath)
    }
  }

  const uploadFileItem = async (item: UploadItem, targetFolderPath?: string) => {
    const uploadPath = targetFolderPath || currentPath
    const formData = new FormData()
    formData.append('file', item.file)
    formData.append('path', uploadPath)

    setUploadItems(prev =>
      prev.map(upload => upload.id === item.id
        ? { ...upload, status: 'uploading' as const }
        : upload
      )
    )

    // Create a toast with progress for this upload
    const toastId = toast.loading(
      `${item.file.name}`,
      {
        description: `Uploading to ${targetFolderPath ? files.find(f => f.path === targetFolderPath)?.name || 'folder' : 'current folder'}`,
        duration: Infinity,
      }
    )

    try {
      await axios.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded)
          )
          setUploadItems(prev =>
            prev.map(upload => upload.id === item.id
              ? { ...upload, progress: percentCompleted }
              : upload
            )
          )

          // Update toast progress
          toast.loading(
            `${item.file.name}`,
            {
              description: `Uploading to ${targetFolderPath ? files.find(f => f.path === targetFolderPath)?.name || 'folder' : 'current folder'} (${percentCompleted}%)`,
              duration: Infinity,
              id: toastId,
            }
          )
        },
      })

      setUploadItems(prev =>
        prev.map(upload => upload.id === item.id
          ? { ...upload, status: 'completed' as const, progress: 100 }
          : upload
        )
      )

      // Update toast to success
      const targetFolder = targetFolderPath ? files.find(f => f.path === targetFolderPath)?.name || 'folder' : 'current folder'
      toast.success(`${item.file.name} uploaded successfully`, {
        description: `Saved to ${targetFolder}`,
        duration: 3000,
        id: toastId,
      })

      fetchFiles() // Refresh to show new files
    } catch (error) {
      setUploadItems(prev =>
        prev.map(upload => upload.id === item.id
          ? { ...upload, status: 'error' as const, error: 'Upload failed' }
          : upload
        )
      )
      toast.error(`Upload failed: ${item.file.name}`, {
        description: 'Please try again',
        duration: 5000,
        id: toastId,
      })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return

    const filesArray = Array.from(fileList)
    handleMultipleUploads(filesArray)
    e.target.value = ''
  }

  const handleFolderCreate = async () => {
    if (!newFolderName.trim()) return

    try {
      const response = await axios.post('/api/uploads/folder', {
        path: currentPath,
        name: newFolderName.trim()
      })

      toast.success(`Folder "${newFolderName}" created successfully`)
      setNewFolderName('')
      setShowFolderDialog(false)
      fetchFiles()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create folder'
      toast.error(errorMessage)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return

    try {
      const deletePromises = Array.from(selectedFiles).map(fileId =>
        axios.delete(`/api/uploads?path=${fileId}`)
      )

      await Promise.all(deletePromises)
      toast.success(`${selectedFiles.size} files deleted successfully`)
      setSelectedFiles(new Set())
      fetchFiles()
    } catch (error) {
      toast.error('Failed to delete some files')
    }
  }

  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0) return

    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId)
      if (file?.type === 'file') {
        handleDownload(file)
      }
    }
  }

  const handleDelete = async (item: FileItem) => {
    try {
      await axios.delete(`/api/uploads?path=${item.path}`)
      toast.success(`${item.name} deleted successfully`)
      fetchFiles()
    } catch (error) {
      toast.error(`Failed to delete ${item.name}`)
    }
  }

  const handleDownload = async (item: FileItem) => {
    try {
      const response = await axios.get(`/api/uploads/download?path=${item.path}`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', item.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const clearCompletedUploads = () => {
    setUploadItems(prev => prev.filter(item => item.status !== 'completed'))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (name: string, type: string) => {
    if (type === 'folder') {
      return <Folder className="w-5 h-5 text-blue-500" />
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
      case 'svg':
        return <FileImage className="w-5 h-5 text-green-500" />
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <FileVideo className="w-5 h-5 text-purple-500" />
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <FileAudio className="w-5 h-5 text-red-500" />
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'md':
        return <FileText className="w-5 h-5 text-blue-600" />
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'php':
      case 'html':
      case 'css':
      case 'scss':
      case 'sql':
        return <FileCode className="w-5 h-5 text-yellow-500" />
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'bz2':
        return <FileArchive className="w-5 h-5 text-orange-500" />
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
      default:
        return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const getLargeFileIcon = (name: string, type: string) => {
    if (type === 'folder') {
      return <Folder className="w-12 h-12 text-blue-500" />
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
      case 'svg':
        return <FileImage className="w-12 h-12 text-green-500" />
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <FileVideo className="w-12 h-12 text-purple-500" />
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <FileAudio className="w-12 h-12 text-red-500" />
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'md':
        return <FileText className="w-12 h-12 text-blue-600" />
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'php':
      case 'html':
      case 'css':
      case 'scss':
      case 'sql':
        return <FileCode className="w-12 h-12 text-yellow-500" />
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'bz2':
        return <FileArchive className="w-12 h-12 text-orange-500" />
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
      default:
        return <File className="w-12 h-12 text-gray-500" />
    }
  }

  const getIconFileIcon = (name: string, type: string) => {
    if (type === 'folder') {
      return <Folder className="w-8 h-8 text-blue-500" />
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
      case 'svg':
        return <FileImage className="w-8 h-8 text-green-500" />
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <FileVideo className="w-8 h-8 text-purple-500" />
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <FileAudio className="w-8 h-8 text-red-500" />
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'md':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'php':
      case 'html':
      case 'css':
      case 'scss':
      case 'sql':
        return <FileCode className="w-8 h-8 text-yellow-500" />
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'bz2':
        return <FileArchive className="w-8 h-8 text-orange-500" />
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
      default:
        return <File className="w-8 h-8 text-gray-500" />
    }
  }

  // Sort and filter files
  const sortedAndFilteredFiles = files
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let aVal: string | number | Date
      let bVal: string | number | Date

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'type':
          aVal = a.type === 'folder' ? 0 : 1
          bVal = b.type === 'folder' ? 0 : 1
          break
        case 'size':
          aVal = a.size || 0
          bVal = b.size || 0
          break
        case 'modified':
          aVal = new Date(a.modified)
          bVal = new Date(b.modified)
          break
        default:
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
      }

      let comparison = 0
      if (aVal < bVal) comparison = -1
      else if (aVal > bVal) comparison = 1

      return sortDirection === 'asc' ? comparison : -comparison
    })

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Main File Explorer */}
        <div className="w-full">
          <Card>
            <CardHeader>
              {/* Breadcrumb Navigation and Selected Files Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <button
                    onClick={() => navigateToFolder('/')}
                    className="hover:text-foreground transition-colors"
                  >
                    Home
                  </button>
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex items-center">
                      <ChevronRight className="w-4 h-4 mx-1" />
                      <button
                        onClick={() => navigateToFolder('/' + breadcrumbs.slice(0, index + 1).join('/'))}
                        className="hover:text-foreground transition-colors"
                      >
                        {crumb}
                      </button>
                    </span>
                  ))}
                </div>
                {selectedFiles.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSelected}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ({selectedFiles.size})
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete ({selectedFiles.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Files</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedFiles.size} selected files? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSelected}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <CardTitle>Files ({selectedFiles.size} of {files.length} selected) </CardTitle>
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ChevronsUpDown className="w-4 h-4 mr-2" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSort('name')}>
                        📝 Name {sortField === 'name' && sortDirection === 'asc' ? '↑' : sortField === 'name' && sortDirection === 'desc' ? '↓' : ''}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('type')}>
                        📁 Type {sortField === 'type' && sortDirection === 'asc' ? '↑' : sortField === 'type' && sortDirection === 'desc' ? '↓' : ''}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('size')}>
                        📏 Size {sortField === 'size' && sortDirection === 'asc' ? '↑' : sortField === 'size' && sortDirection === 'desc' ? '↓' : ''}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('modified')}>
                        📅 Modified {sortField === 'modified' && sortDirection === 'asc' ? '↑' : sortField === 'modified' && sortDirection === 'desc' ? '↓' : ''}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Tìm kiếm file, folder..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                  {/* View Mode Controls */}
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-r-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-none border-x"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'icons' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('icons')}
                      className="rounded-l-none"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <File className="w-4 h-4 mr-2" />
                        Upload Files
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // For folder upload, we need to show instructions
                        // since browsers don't allow programmatic folder picker opening
                        toast.info('Use drag & drop to upload folders, or click "Choose Files" and select a folder')
                      }}>
                        <Folder className="w-4 h-4 mr-2" />
                        Upload Folder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowFolderDialog(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Create Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>

              {/* File Viewer */}
              <div
                className={`border rounded-md transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ height: '500px', overflow: 'hidden' }}
              >
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <Spinner />
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No files in this directory</p>
                      <p className="text-sm">Upload some files to get started</p>
                    </div>
                  ) : (
                    <>

                      {/* File Viewer Content */}
                      {viewMode === 'list' && (
                        <div>
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 border-b text-sm font-medium text-muted-foreground">
                            <div className="col-span-1 flex items-center gap-3">
                              <Checkbox
                                checked={selectedFiles.size === files.length}
                                onCheckedChange={toggleAllFiles}
                              />
                            </div>
                            <div className="col-span-6">
                              <button
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => handleSort('name')}
                              >
                                Name
                                {sortField === 'name' && (
                                  <span className="text-xs">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="col-span-2">
                              <button
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => handleSort('size')}
                              >
                                Size
                                {sortField === 'size' && (
                                  <span className="text-xs">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="col-span-2">
                              <button
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => handleSort('modified')}
                              >
                                Modified
                                {sortField === 'modified' && (
                                  <span className="text-xs">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="col-span-1"></div>
                          </div>

                          {/* Table Content */}
                          <div className="divide-y">
                            {sortedAndFilteredFiles.map((item) => (
                              <div
                                key={item.id}
                                className={`grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                                  selectedFiles.has(item.id) ? 'bg-primary/5' : ''
                                } ${
                                  item.type === 'folder' && droppedFolderPath === item.path ? 'bg-primary/10 ring-1 ring-primary' : ''
                                }`}
                                onClick={(e) => handleClick(item, e)}
                                onDoubleClick={() => handleDoubleClick(item)}
                                onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.path) : undefined}
                                onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
                                onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.path) : undefined}
                              >
                                <div className="col-span-1 flex items-center">
                                  <Checkbox
                                    checked={selectedFiles.has(item.id)}
                                    onCheckedChange={() => toggleFileSelection(item.id)}
                                  />
                                </div>
                                <div className="col-span-6 flex items-center gap-3">
                                  {getFileIcon(item.name, item.type)}
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                      title={item.name}
                                    >
                                      {item.name}
                                    </div>
                                    {item.type === 'folder' && droppedFolderPath === item.path && (
                                      <div className="text-xs text-primary font-medium">Drop files here to upload</div>
                                    )}
                                  </div>
                                </div>

                                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                                  {formatFileSize(item.size) || '--'}
                                </div>
                                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                                  {new Date(item.modified).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 flex items-center justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {item.type === 'file' && (
                                        <DropdownMenuItem onClick={() => handleDownload(item)}>
                                          <Download className="w-4 h-4 mr-2" />
                                          Download
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(item)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewMode === 'grid' && (
                        <div className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                            {sortedAndFilteredFiles.map((item) => (
                              <div
                                key={item.id}
                                className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                                  selectedFiles.has(item.id) ? 'ring-2 ring-primary' : ''
                                } ${
                                  item.type === 'folder' && droppedFolderPath === item.path ? 'bg-primary/10 ring-1 ring-primary' : ''
                                }`}
                                onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.path) : undefined}
                                onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
                                onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.path) : undefined}
                                onClick={(e) => handleClick(item, e)}
                                onDoubleClick={() => handleDoubleClick(item)}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  // Could add right-click menu here
                                }}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox
                                    checked={selectedFiles.has(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onCheckedChange={() => toggleFileSelection(item.id)}
                                    className="mb-2"
                                  />
                                  {getLargeFileIcon(item.name, item.type)}
                                  <div className="text-center">
                                    <p
                                      className="font-medium text-sm truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                      title={item.name}
                                      style={{ maxWidth: '120px' }}
                                    >
                                      {item.name}
                                    </p>
                                    {item.size !== undefined && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatFileSize(item.size)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewMode === 'icons' && (
                        <div className="p-4">
                          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-6">
                            {sortedAndFilteredFiles.map((item) => (
                              <div
                                key={item.id}
                                className={`flex flex-col items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer ${
                                  selectedFiles.has(item.id) ? 'bg-primary/10' : ''
                                } ${
                                  item.type === 'folder' && droppedFolderPath === item.path ? 'bg-primary/20 ring-1 ring-primary' : ''
                                }`}
                                onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.path) : undefined}
                                onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
                                onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.path) : undefined}
                                onClick={(e) => handleClick(item, e)}
                                onDoubleClick={() => handleDoubleClick(item)}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <Checkbox
                                    checked={selectedFiles.has(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onCheckedChange={() => toggleFileSelection(item.id)}
                                    className="mb-1"
                                  />
                                  {getIconFileIcon(item.name, item.type)}
                                  <p
                                    className="text-xs text-center leading-tight truncate overflow-hidden text-ellipsis whitespace-nowrap"
                                    title={item.name}
                                    style={{ maxWidth: '80px' }}
                                  >
                                    {item.name}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>


      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '' } as any)}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Create Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFolderCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFolderCreate}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
