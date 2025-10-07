import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
      include: { tenant: true },
      orderBy: { tenant: { createdAt: 'asc' } }
    })

    return NextResponse.json(userTenants)
  } catch (error) {
    console.error('Error fetching user tenants:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
