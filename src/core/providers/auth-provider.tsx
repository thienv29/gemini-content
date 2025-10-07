"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAuthStore } from "@/stores/auth-store"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { setUser, clearUser } = useAuthStore()

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        provider: session.user.provider,
        activeTenantId: session.user.activeTenantId
      })
    } else {
      clearUser()
    }
  }, [session?.user, setUser, clearUser])

  return <>{children}</>
}
