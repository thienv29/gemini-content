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
    } & DefaultSession["user"]
  }
  interface JWT {
    id?: string
    provider?: string
    providerAccountId?: string
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
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Thêm user data vào JWT token để tránh DB calls khi auth()
      if (user) {
        token.id = user.id
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
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
})
