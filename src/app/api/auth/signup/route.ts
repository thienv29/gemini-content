import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, confirmPassword } = await request.json()

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create default tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const defaultTenant = await tx.tenant.create({
        data: {
          name: `${name}'s Workspace`,
        },
      })

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          activeTenantId: defaultTenant.id,
        }
      })

      await tx.userTenant.create({
        data: {
          userId: user.id,
          tenantId: defaultTenant.id,
          role: 'admin',
        },
      })

      return user
    })

    const user = result

    // Return user without password
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
