import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(request)
    const { id } = await params

    const promptGroup = await prisma.promptGroup.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        prompts: {
          include: {
            prompt: true
          }
        },
        _count: {
          select: { prompts: true }
        }
      }
    })

    if (!promptGroup) {
      return NextResponse.json({ error: 'Prompt group not found' }, { status: 404 })
    }

    return NextResponse.json(promptGroup)
  } catch (error) {
    console.error('Error fetching prompt group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(request)
    const { id } = await params

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const promptGroup = await prisma.promptGroup.updateMany({
      where: {
        id,
        tenantId
      },
      data: {
        name,
        description
      }
    })

    if (promptGroup.count === 0) {
      return NextResponse.json({ error: 'Prompt group not found' }, { status: 404 })
    }

    const updatedPromptGroup = await prisma.promptGroup.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        prompts: {
          include: {
            prompt: true
          }
        },
        _count: {
          select: { prompts: true }
        }
      }
    })

    return NextResponse.json(updatedPromptGroup)
  } catch (error) {
    console.error('Error updating prompt group:', error)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(request)
    const { id } = await params

    const promptGroup = await prisma.promptGroup.deleteMany({
      where: {
        id,
        tenantId
      }
    })

    if (promptGroup.count === 0) {
      return NextResponse.json({ error: 'Prompt group not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Prompt group deleted successfully' })
  } catch (error) {
    console.error('Error deleting prompt group:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
