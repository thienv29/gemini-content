import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { promptId } = body

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 })
    }

    // Verify that both group and prompt belong to the user's tenant
    const [group, prompt] = await Promise.all([
      prisma.promptGroup.findFirst({
        where: {
          id: params.groupId,
          tenantId: session.user.activeTenantId
        }
      }),
      prisma.prompt.findFirst({
        where: {
          id: promptId,
          tenantId: session.user.activeTenantId
        }
      })
    ])

    if (!group || !prompt) {
      return NextResponse.json({ error: 'Group or prompt not found' }, { status: 404 })
    }

    // Check if mapping already exists
    const existingMapping = await prisma.promptGroupMapping.findFirst({
      where: {
        promptId,
        groupId: params.groupId
      }
    })

    if (existingMapping) {
      return NextResponse.json({ error: 'Prompt is already in this group' }, { status: 409 })
    }

    const mapping = await prisma.promptGroupMapping.create({
      data: {
        promptId,
        groupId: params.groupId
      },
      include: {
        prompt: true,
        group: true
      }
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    console.error('Error adding prompt to group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.activeTenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { promptId } = body

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 })
    }

    // Verify that the group belongs to the user's tenant
    const group = await prisma.promptGroup.findFirst({
      where: {
        id: params.groupId,
        tenantId: session.user.activeTenantId
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const mapping = await prisma.promptGroupMapping.deleteMany({
      where: {
        promptId,
        groupId: params.groupId
      }
    })

    if (mapping.count === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Prompt removed from group successfully' })
  } catch (error) {
    console.error('Error removing prompt from group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
