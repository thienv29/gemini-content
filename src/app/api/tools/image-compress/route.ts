import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getToken } from 'next-auth/jwt'

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

async function ensureImageCompressDir(tenantId: string) {
  // Create date-based folder structure: image-compress/year/month/day
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
  const day = now.getDate().toString().padStart(2, '0')

  const compressDir = path.join(UPLOADS_DIR, tenantId, 'image-compress', year, month, day)

  try {
    await fs.access(compressDir)
  } catch {
    await fs.mkdir(compressDir, { recursive: true })
  }
  return compressDir
}

// POST /api/tools/image-compress - Compress image
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = token.activeTenantId as string
    const compressDir = await ensureImageCompressDir(tenantId)

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSizeBytes = 50 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const originalSize = buffer.length

    // Get original image metadata
    let metadata: sharp.Metadata
    try {
      metadata = await sharp(buffer).metadata()
    } catch (error) {
      console.error('Error getting image metadata:', error)
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Generate compressed filename
    const parsedPath = path.parse(file.name)
    const compressedFileName = `compressed_${Date.now()}_${parsedPath.name}.jpg`
    const compressedFilePath = path.join(compressDir, compressedFileName)

    // Compress image using sharp
    const compressionOptions = {
      quality: 80, // Good quality balance
      progressive: true,
      mozjpeg: true, // Better compression for JPEG
    }

    let processedBuffer: Buffer

    try {
      // Resize if image is very large (>4000px on any side), maintain aspect ratio
      let pipeline = sharp(buffer)

      if (metadata.width && metadata.width > 4000) {
        pipeline = pipeline.resize(4000, null, { withoutEnlargement: true })
      } else if (metadata.height && metadata.height > 4000) {
        pipeline = pipeline.resize(null, 4000, { withoutEnlargement: true })
      }

      // Convert to JPEG for consistent compression
      processedBuffer = await pipeline
        .jpeg(compressionOptions)
        .toBuffer()

    } catch (error) {
      console.error('Error processing image:', error)
      return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
    }

    const compressedSize = processedBuffer.length

    // Save compressed image
    await fs.writeFile(compressedFilePath, processedBuffer)

    // Calculate relative path for API access
    const relativePath = path.relative(UPLOADS_DIR, compressedFilePath)

    return NextResponse.json({
      success: true,
      originalSize: originalSize,
      compressedSize: compressedSize,
      compressionRatio: ((originalSize - compressedSize) / originalSize * 100),
      filePath: relativePath,
      fileName: compressedFileName,
      message: `Image compressed successfully from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}`
    }, { status: 200 })

  } catch (error) {
    console.error('Error compressing image:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
