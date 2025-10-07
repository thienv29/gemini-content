import NextAuth, { DefaultSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      provider?: string
      activeTenantId?: string
    } & DefaultSession["user"]
  }
  interface JWT {
    id?: string
    provider?: string
    providerAccountId?: string
    activeTenantId?: string
  }
  interface User {
    activeTenantId?: string
  }
}

export async function getTenantId(session: {
  user?: {
    id?: string
    activeTenantId?: string
  }
} | null | undefined) {
  "use server"

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  let tenantId = session.user.activeTenantId
  if (!tenantId) {
    // Try to get user's first tenant
    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
      include: { tenant: true },
      take: 1
    })
    if (userTenants.length === 0) {
      throw new Error('No tenant found')
    }
    tenantId = userTenants[0].tenantId
  }

  return tenantId
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Sử dụng JWT thay database sessions để giảm DB calls
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email
          },
          include: {
            userTenants: {
              include: {
                tenant: true
              }
            }
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Use activeTenantId from user, or first tenant if not set
        let activeTenantId = user.activeTenantId
        if (!activeTenantId && user.userTenants.length > 0) {
          activeTenantId = user.userTenants[0].tenantId
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          activeTenantId: activeTenantId || undefined
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user has a default tenant
      if (account?.provider !== 'credentials' && user?.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              userTenants: {
                include: { tenant: true }
              }
            }
          })
          if (dbUser) {
            if (dbUser.userTenants.length === 0) {
              const defaultTenant = await prisma.tenant.create({
                data: {
                  name: `${dbUser.name || 'User'}'s Workspace`,
                },
              })

              await prisma.userTenant.create({
                data: {
                  userId: dbUser.id,
                  tenantId: defaultTenant.id,
                  role: 'admin',
                },
              })

              await prisma.user.update({
                where: { id: dbUser.id },
                data: { activeTenantId: defaultTenant.id },
              })

              user.activeTenantId = defaultTenant.id
            } else {
              user.activeTenantId = dbUser.activeTenantId || dbUser.userTenants[0].tenantId
            }
          }
        } catch (error) {
          console.error('Error in signIn for OAuth:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      
      
      // Always include activeTenantId in token, even if user obj doesn't have it
      if (user && user.id) {
        token.id = user.id
        // Ensure tenant ID is always in token for performance
        if (user.activeTenantId) {
          token.activeTenantId = user.activeTenantId
        } else {
          // Query DB to get tenant ID and cache it
          try {
            const userTenants = await prisma.userTenant.findMany({
              where: { userId: user.id },
              include: { tenant: true },
              take: 1
            })
            if (userTenants.length > 0) {
              token.activeTenantId = userTenants[0].tenantId
            }
          } catch (error) {
            console.error('Error fetching tenant in JWT callback:', error)
          }
        }
      }

      if (trigger === "update" && token.id) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.id  as string },
          select: { activeTenantId: true },
        })
        if (updatedUser) {
          token.activeTenantId = updatedUser.activeTenantId
        }
      }

      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }

      return token
    },
    async session({ session, token }) {
      // Populate session từ JWT token, không cần DB
      if (token) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
        session.user.activeTenantId = token.activeTenantId as string
      }
      return session
    }
  },
  events: {
    async createUser({ user }) {
      try {
        const defaultTenant = await prisma.tenant.create({
          data: {
            name: `${user.name || 'User'}'s Workspace`,
          },
        })

        await prisma.userTenant.create({
          data: {
            userId: user.id as string,
            tenantId: defaultTenant.id,
            role: 'admin',
          },
        })

        await prisma.user.update({
          where: { id: user.id as string },
          data: { activeTenantId: defaultTenant.id },
        })

        console.log('Updated user activeTenantId')
      } catch (error) {
        console.error('Error creating default tenant for new user:', error)
      }
    }
  },
  pages: {
    signIn: '/login',
  },
})
