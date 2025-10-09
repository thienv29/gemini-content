import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getToken } from 'next-auth/jwt'

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR)
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  }
}

// GET /api/uploads?path=/some/path - List files in directory
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const { searchParams } = new URL(request.url)
    const relativePath = searchParams.get('path') || '/'

    const tenantDir = path.join(UPLOADS_DIR, tenantId)
    const fullPath = path.join(tenantDir, relativePath === '/' ? '' : relativePath)

    // Ensure the directory exists (allow accessing trash directly)
    try {
      await fs.access(fullPath)
    } catch {
      // Special case: allow creating/accessing trash directory
      if (relativePath === '/.trash') {
        try {
          await fs.mkdir(fullPath, { recursive: true })
          return NextResponse.json({ files: [] }, { status: 200 })
        } catch {
          return NextResponse.json({ files: [] }, { status: 200 })
        }
      }
      return NextResponse.json({ files: [] }, { status: 200 })
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async (entry) => {
        // Skip the trash directory in normal listings (but show it if directly navigating to it)
        if (entry.name === TRASH_DIR_NAME && relativePath !== '/' + TRASH_DIR_NAME) {
          return null
        }

        const filePath = path.join(fullPath, entry.name)
        const relativeEntryPath = path.join(relativePath, entry.name)

        try {
          const stats = await fs.stat(filePath)
          return {
            id: relativeEntryPath,
            name: entry.name,
            type: entry.isDirectory() ? 'folder' : 'file',
            size: entry.isFile() ? stats.size : undefined,
            modified: stats.mtime.toISOString().split('T')[0], // Format as YYYY-MM-DD
            path: relativeEntryPath,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({ files: files.filter(Boolean) }, { status: 200 })
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/uploads - Upload files
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const formData = await request.formData()
    const files = formData.getAll('file')
    const targetPath = formData.get('path') as string || '/'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId)
    await fs.mkdir(tenantDir, { recursive: true })

    const uploadResults = []

    for (const file of files) {
      // File from FormData should be a File-like object
      if (!file || typeof file !== 'object' || !('name' in file)) continue

      const fileName = file.name

      // For folder uploads, the filename might include subpaths
      // Handle cases like "images/thumbs/150x0/file.png"
      const fullFileName = fileName
      const fileNameParts = fullFileName.split('/').filter(Boolean)
      let filePath: string
      let actualFileName: string

      if (fileNameParts.length > 1) {
        // This is a nested file from folder upload
        actualFileName = fileNameParts.pop()! // Get actual filename
        const nestedPath = fileNameParts.join('/') // Get directory path

        const targetDir = path.join(tenantDir, targetPath === '/' ? nestedPath : path.join(targetPath, nestedPath))
        await fs.mkdir(targetDir, { recursive: true })
        filePath = path.join(targetDir, actualFileName)
      } else {
        // Regular file upload
        actualFileName = fullFileName
        const targetDir = path.join(tenantDir, targetPath === '/' ? '' : targetPath)
        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true })
        filePath = path.join(targetDir, actualFileName)
      }

      // Read file content and write to disk
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      uploadResults.push({
        name: fileName,
        size: file.size,
        path: path.join(targetPath, fileName),
      })
    }

    return NextResponse.json({
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      files: uploadResults,
    }, { status: 200 })

  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const TRASH_DIR_NAME = '.trash'

// DELETE /api/uploads?path=/some/path - Move to trash or permanently delete if in trash
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const { searchParams } = new URL(request.url)
    const targetPath = searchParams.get('path')

    if (!targetPath) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId)
    const fullPath = path.join(tenantDir, targetPath)

    // Check if file/directory exists
    try {
      await fs.access(fullPath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stats = await fs.stat(fullPath)

    // Check if we're in trash folder
    const normalizedTargetPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath
    const inTrash = normalizedTargetPath.startsWith(TRASH_DIR_NAME)

    if (inTrash) {
      // Permanently delete if in trash
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }
      return NextResponse.json({ message: 'File permanently deleted' }, { status: 200 })
    } else {
      // Move to trash
      const trashDir = path.join(tenantDir, TRASH_DIR_NAME)
      await fs.mkdir(trashDir, { recursive: true })

      const fileName = path.basename(fullPath)
      let trashPath = path.join(trashDir, fileName)

      // Handle name conflicts in trash
      let counter = 1
      while (true) {
        try {
          await fs.access(trashPath)
          // File exists, create new name
          const parsedPath = path.parse(fileName)
          trashPath = path.join(trashDir, `${parsedPath.name}_${counter}${parsedPath.ext}`)
          counter++
        } catch {
          // File doesn't exist, safe to use
          break
        }
      }

      await fs.rename(fullPath, trashPath)
      return NextResponse.json({ message: 'File moved to trash' }, { status: 200 })
    }

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
