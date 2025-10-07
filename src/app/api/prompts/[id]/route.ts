import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request)

    const prompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        tenantId
      },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    return NextResponse.json(prompt)
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request)

    const body = await request.json()
    const { name, description, content, variables, groups } = body

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 })
    }

    // Check if prompt exists and belongs to tenant
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        tenantId
      },
      include: {
        groups: true
      }
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Update prompt
    const updatedPrompt = await prisma.prompt.update({
      where: { id: params.id },
      data: {
        name,
        description,
        content,
        variables: variables || {}
      }
    })

    // Handle group assignments
    const currentGroupIds = existingPrompt.groups.map(g => g.groupId)
    const newGroupIds = groups || []

    // Remove assignments for groups not in the new list
    const toRemove = currentGroupIds.filter(id => !newGroupIds.includes(id))
    for (const groupId of toRemove) {
      await prisma.promptGroupMapping.deleteMany({
        where: {
          promptId: params.id,
          groupId
        }
      })
    }

    // Add assignments for new groups
    const toAdd = newGroupIds.filter((id: string) => !currentGroupIds.includes(id))
    for (const groupId of toAdd) {
      await prisma.promptGroupMapping.create({
        data: {
          promptId: params.id,
          groupId
        }
      })
    }

    // Fetch updated prompt with groups
    const result = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        tenantId
      },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating prompt:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request)

    const prompt = await prisma.prompt.deleteMany({
      where: {
        id: params.id,
        tenantId
      }
    })

    if (prompt.count === 0) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Prompt deleted successfully' })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
