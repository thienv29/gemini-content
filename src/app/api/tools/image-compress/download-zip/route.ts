import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { getToken } from 'next-auth/jwt'

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// POST /api/tools/image-compress/download-zip - Download multiple compressed images as ZIP
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string

    const body = await request.json()
    const { filePaths }: { filePaths: string[] } = body

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json({ error: 'File paths array required' }, { status: 400 })
    }

    if (filePaths.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 files allowed' }, { status: 400 })
    }

    // Create ZIP file
    const zip = new JSZip()
    let totalSize = 0

    for (const filePath of filePaths) {
      // Validate file path to prevent directory traversal and ensure tenant access
      if (filePath.includes('..') || filePath.includes('..\\') || filePath.includes('../') ||
          filePath.startsWith('/') || filePath.startsWith('\\') ||
          !filePath.startsWith(`${tenantId}/`)) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
      }

      // filePath already includes tenantId prefix, so join with base UPLOADS_DIR
      const fullPath = path.join(UPLOADS_DIR, filePath)

      try {
        // Check if file exists and get stats
        const stats = await fs.stat(fullPath)
        if (!stats.isFile()) {
          continue // Skip directories
        }

        // Read file content
        const fileContent = await fs.readFile(fullPath)

        // Add to ZIP with original filename (not full path)
        const fileName = path.basename(filePath)
        zip.file(fileName, fileContent)

        totalSize += fileContent.length

        // Limit total ZIP size (100MB)
        if (totalSize > 100 * 1024 * 1024) {
          return NextResponse.json({ error: 'Total file size exceeds 100MB limit' }, { status: 400 })
        }
      } catch (error) {
        console.warn(`Failed to add file ${filePath} to ZIP:`, error)
        // Continue with other files
      }
    }

    if (Object.keys(zip.files).length === 0) {
      return NextResponse.json({ error: 'No valid files found' }, { status: 404 })
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6  // Good balance of speed and compression
      }
    })

    // Create response with ZIP content
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const fileName = `compressed_images_${timestamp}.zip`

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })

  } catch (error) {
    console.error('Error creating ZIP file:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
