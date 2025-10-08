import { NextRequest, NextResponse } from 'next/server'
import { handleBulkDelete } from '@/lib/api-utils'
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

    // Check if any of the groups contain prompts
    const groupsWithPrompts = await prisma.promptGroup.findMany({
      where: {
        id: { in: ids },
        tenantId,
        prompts: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { prompts: true }
        }
      }
    })

    if (groupsWithPrompts.length > 0) {
      const groupNames = groupsWithPrompts.map(g => `${g.name} (${g._count.prompts} prompts)`).join(', ')
      return NextResponse.json({
        error: `Cannot delete prompt groups that contain prompts: ${groupNames}`
      }, { status: 400 })
    }

    return handleBulkDelete({
      table: 'promptGroup',
      entityName: 'prompt group',
      request,
      ids
    })
  } catch (error) {
    console.error('Error bulk deleting prompt groups:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
