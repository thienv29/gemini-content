import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'



export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Search params
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: any = { tenantId }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { prompts: { some: { prompt: { name: { contains: search } } } } }
      ]
    }

    // Get total count for pagination (using findMany since count doesn't support 'mode' and nested relations)
    const allMatching = await prisma.promptGroup.findMany({
      where,
      select: { id: true }
    })
    const total = allMatching.length

    // Get paginated results
    const promptGroups = await prisma.promptGroup.findMany({
      where,
      include: {
        prompts: {
          include: {
            prompt: true
          }
        },
        _count: {
          select: { prompts: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    return NextResponse.json({
      data: promptGroups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching prompt groups:', error)
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
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const promptGroup = await prisma.promptGroup.create({
      data: {
        name,
        description,
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

    return NextResponse.json(promptGroup, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
