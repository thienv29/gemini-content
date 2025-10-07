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
    async signIn({ user, account, profile }) {
      // For OAuth providers, ensure user has a default tenant if none exists
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
              // Create default tenant for new user
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
          console.error('Error in signIn tenant creation:', error)
          return false // Deny access if tenant creation fails
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Thêm user data vào JWT token để tránh DB calls khi auth()
      if (user) {
        token.id = user.id
        token.activeTenantId = user.activeTenantId
      }
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
        // Chỉ store cần thiết, tránh bloated JWT
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
  pages: {
    signIn: '/login',
  },
})
