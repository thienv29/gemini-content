import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getToken } from 'next-auth/jwt'

// Base uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// POST /api/uploads/folder - Create folder
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const body = await request.json()
    const { path: currentPath = '/', name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    // Validate folder name (no slash characters, etc.)
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const tenantDir = path.join(UPLOADS_DIR, tenantId)

    // Build the full folder path
    const folderPath = path.join(
      tenantDir,
      currentPath === '/' ? name : path.join(currentPath.replace(/\/+$/, ''), name)
    )

    // Ensure parent directory exists
    const parentDir = path.dirname(folderPath)
    await fs.mkdir(parentDir, { recursive: true })

    // Try to create the folder
    try {
      await fs.mkdir(folderPath, { recursive: false })
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        return NextResponse.json({ error: 'Folder already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      message: 'Folder created successfully',
      folder: {
        name,
        path: currentPath === '/' ? '/' + name : currentPath.replace(/\/$/, '') + '/' + name,
        type: 'folder'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
