import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function getTenantId(request: NextRequest): Promise<string> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) {
    throw new Error('Unauthorized')
  }

  const tenantId = token.activeTenantId as string
  if (!tenantId) {
    throw new Error('No tenant found')
  }

  return tenantId
}
