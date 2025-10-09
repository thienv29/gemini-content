import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getToken } from 'next-auth/jwt'

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId)
    const fullPath = path.join(tenantDir, filePath)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stats = await fs.stat(fullPath)

    // Check if it's a directory
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot download directory' }, { status: 400 })
    }

    // Read file content
    const fileBuffer = await fs.readFile(fullPath)

    // Get file extension for content type
    const ext = path.extname(filePath).toLowerCase()
    const contentType = getContentType(ext)

    // Get file name and properly encode for header
    const fileName = path.basename(filePath)

    // Encode filename for Content-Disposition header
    const encodedFileName = encodeURIComponent(fileName)

    // Create response with proper headers for Unicode filenames
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': stats.size.toString(),
      },
    })
    return response

  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.txt': 'text/plain',
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
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
  }

  return contentTypes[ext] || 'application/octet-stream'
}
