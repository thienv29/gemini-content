import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    // Check if user has access to this tenant
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        userId: session.user.id,
        tenantId: tenantId,
      },
    })

    if (!userTenant) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 })
    }

    // Update user's active tenant
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeTenantId: tenantId },
    })

    return NextResponse.json({ message: 'Active tenant updated successfully' })
  } catch (error) {
    console.error('Error updating active tenant:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
