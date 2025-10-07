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

    const count = await prisma.userTenant.count({
      where: { tenantId: id },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error counting tenant users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
