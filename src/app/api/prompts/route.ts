import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)

    const prompts = await prisma.prompt.findMany({
      where: { tenantId },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Error fetching prompts:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, {
        status: error.message === 'Unauthorized' ? 401 : 400
      })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)

    const body = await request.json()
    const { name, description, content, variables } = body

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 })
    }

    const prompt = await prisma.prompt.create({
      data: {
        name,
        description,
        content,
        variables: variables || {},
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

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
