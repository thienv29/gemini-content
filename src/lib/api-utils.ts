import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

interface BulkDeleteOptions {
  table: keyof PrismaClient
  entityName: string
  request: NextRequest
}

export async function handleBulkDelete({ table, entityName, request }: BulkDeleteOptions) {
  try {
    const tenantId = await getTenantId(request)

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    // Access the table dynamically
    const prismaModel = (prisma as any)[table]
    const result = await prismaModel.deleteMany({
      where: {
        id: {
          in: ids
        },
        tenantId
      }
    })

    return NextResponse.json({
      message: `${result.count} ${entityName}s deleted successfully`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error(`Error bulk deleting ${entityName}s:`, error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
