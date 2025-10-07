import { create } from 'zustand'

interface User {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  provider?: string
  activeTenantId?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  updateActiveTenant: (tenantId: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({
    user,
    isAuthenticated: !!user
  }),
  updateActiveTenant: (tenantId) => set((state) => ({
    user: state.user ? { ...state.user, activeTenantId: tenantId } : null
  })),
  clearUser: () => set({
    user: null,
    isAuthenticated: false
  })
}))
