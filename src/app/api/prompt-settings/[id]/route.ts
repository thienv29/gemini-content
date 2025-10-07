import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId as getTenantIdFromLib } from '@/lib/tenant'



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantIdFromLib(request)
    const { id } = await params

    const promptSetting = await prisma.promptSetting.findFirst({
      where: {
        id,
        tenantId
      }
    })

    if (!promptSetting) {
      return NextResponse.json({ error: 'Prompt setting not found' }, { status: 404 })
    }

    return NextResponse.json(promptSetting)
  } catch (error) {
    console.error('Error fetching prompt setting:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantIdFromLib(request)
    const { id } = await params

    const body = await request.json()
    const { name, description, items } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const promptSetting = await prisma.promptSetting.updateMany({
      where: {
        id,
        tenantId
      },
      data: {
        name,
        description,
        items: items || {}
      }
    })

    if (promptSetting.count === 0) {
      return NextResponse.json({ error: 'Prompt setting not found' }, { status: 404 })
    }

    const updatedPromptSetting = await prisma.promptSetting.findFirst({
      where: {
        id,
        tenantId
      }
    })

    return NextResponse.json(updatedPromptSetting)
  } catch (error) {
    console.error('Error updating prompt setting:', error)
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
    const tenantId = await getTenantIdFromLib(request)
    const { id } = await params

    const promptSetting = await prisma.promptSetting.deleteMany({
      where: {
        id,
        tenantId
      }
    })

    if (promptSetting.count === 0) {
      return NextResponse.json({ error: 'Prompt setting not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Prompt setting deleted successfully' })
  } catch (error) {
    console.error('Error deleting prompt setting:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
