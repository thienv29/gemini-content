import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name } = body

  if (!name) {
    return NextResponse.json({ error: "Tenant name required" }, { status: 400 })
  }

  try {
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
      },
    })

    // Add user as admin to tenant
    await prisma.userTenant.create({
      data: {
        userId: session.user.id,
        tenantId: tenant.id,
        role: 'admin',
      },
    })

    return NextResponse.json({
      tenant,
      message: "Tenant created successfully"
    })
  } catch (error) {
    console.error("Error creating tenant:", error)
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 })
  }
}
