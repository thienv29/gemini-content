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
    const where: {
      tenantId: string
      OR?: Array<{
        name?: { contains: string; mode: string }
        description?: { contains: string; mode: string }
      }>
    } = { tenantId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count for pagination
    const total = await prisma.promptSetting.count({ where })

    // Get paginated results
    const promptSettings = await prisma.promptSetting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    return NextResponse.json({
      data: promptSettings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching prompt settings:', error)
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
    const { name, description, items } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const promptSetting = await prisma.promptSetting.create({
      data: {
        name,
        description,
        items: items || {},
        tenantId
      }
    })

    return NextResponse.json(promptSetting, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt setting:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
