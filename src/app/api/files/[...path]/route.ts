import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Base uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Extract tenant ID from query parameter
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant')

    // Build the full path from the URL parameters
    const filePath = params.path.join('/')

    // Ensure the path doesn't contain '..' or other dangerous patterns
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    // Build the full file path
    const fullPath = path.join(UPLOADS_DIR, tenantId, filePath)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stats = await fs.stat(fullPath)

    // Check if it's a directory
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot access directory' }, { status: 400 })
    }

    // Read file content
    const fileBuffer = await fs.readFile(fullPath)

    // Get file extension for content type
    const ext = path.extname(filePath).toLowerCase()
    const contentType = getContentType(ext)

    // Create response with file content
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })

    return response

  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.ts': 'application/typescript; charset=utf-8',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
  }

  return contentTypes[ext] || 'application/octet-stream'
}
