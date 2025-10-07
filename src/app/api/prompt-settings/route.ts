import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'



export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)

    const promptSettings = await prisma.promptSetting.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(promptSettings)
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
