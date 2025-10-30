import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

interface BulkDeleteOptions {
  table: keyof PrismaClient
  entityName: string
  request: NextRequest
  ids?: string[]
}

export async function handleBulkDelete({ table, entityName, request, ids: providedIds }: BulkDeleteOptions) {
  try {
    const tenantId = await getTenantId(request)

    let ids: string[]
    if (providedIds) {
      ids = providedIds
    } else {
      const body = await request.json()
      ids = body.ids
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    // Access the table dynamically
    const prismaModel = (prisma as unknown as Record<string, {
      deleteMany: (args: { where: { id: { in: string[] }, tenantId: string } }) => Promise<{ count: number }>
    }>)[table as string]
    const result = await prismaModel.deleteMany({
      where: {
        id: {
          in: ids
        },
        tenantId
      }
    })

    // Check if all requested items were actually deleted
    if (result.count !== ids.length) {
      console.warn(`Bulk delete warning: Requested ${ids.length} deletions but only ${result.count} were performed for ${entityName}s`)
    }

    return NextResponse.json({
      message: `${result.count} ${entityName}s deleted successfully`,
      deletedCount: result.count,
      requestedCount: ids.length
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
