import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    // Xóa nhiều prompts cùng lúc
    const result = await prisma.prompt.deleteMany({
      where: {
        id: {
          in: ids
        },
        tenantId
      }
    })

    return NextResponse.json({
      message: `${result.count} prompts deleted successfully`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error bulk deleting prompts:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
