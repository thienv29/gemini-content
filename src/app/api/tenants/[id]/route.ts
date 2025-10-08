import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has access to this tenant
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        userId: session.user.id,
        tenantId: id,
      },
    })

    if (!userTenant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error("Error fetching tenant:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin of this tenant
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        userId: session.user.id,
        tenantId: id,
        role: 'admin',
      },
    })

    if (!userTenant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await req.json()
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tenant name required" }, { status: 400 })
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json({
      tenant,
      message: "Tenant updated successfully"
    })
  } catch (error) {
    console.error("Error updating tenant:", error)
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin of this tenant
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        userId: session.user.id,
        tenantId: id,
        role: 'admin',
      },
    })

    if (!userTenant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete related data in correct order
    await prisma.prompt.deleteMany({
      where: { tenantId: id },
    })

    await prisma.promptGroup.deleteMany({
      where: { tenantId: id },
    })

    await prisma.promptSetting.deleteMany({
      where: { tenantId: id },
    })

    await prisma.userTenant.deleteMany({
      where: { tenantId: id },
    })

    await prisma.tenant.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Tenant deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting tenant:", error)
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 })
  }
}
