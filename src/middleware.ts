import { NextResponse, NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  console.log('Middleware triggered for:', request.nextUrl.pathname)

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  console.log('Token:', !!token, token?.sub, token?.activeTenantId)

  const pathname = request.nextUrl.pathname

  // Skip auth check for auth-related routes
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Check if it's a protected API route
  if (pathname.startsWith('/api/prompts/') ||
      pathname.startsWith('/api/prompt-groups/') ||
      pathname.startsWith('/api/prompt-settings/')) {

    console.log('Protected API route detected')

    if (!token?.sub) {
      console.log('No user token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', token.sub)

    // Authentication passed, just continue to API routes
    // API routes will handle tenant lookup using token.sub
    console.log('Authentication passed, proceeding to API route')
    return NextResponse.next()
  }

  // For dashboard pages, just check auth
  if (pathname.startsWith('/dashboard/')) {
    if (!token?.sub) {
      console.log('Dashboard access without auth, redirecting')
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/prompts/:path*",
    "/api/prompt-groups/:path*",
    "/api/prompt-settings/:path*"
  ]
}
