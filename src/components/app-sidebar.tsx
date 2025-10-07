"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  FileText,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"
import axios from "axios"

const data = {
  navMain: [
    {
      title: "Prompts",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "All Prompts",
          url: "/dashboard/prompts",
        },
        {
          title: "Groups",
          url: "/dashboard/prompt-groups",
        },
        {
          title: "Settings",
          url: "/dashboard/prompt-settings",
        },
      ],
    },
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Workspace",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()
  const [workspaces, setWorkspaces] = React.useState<Array<{
    name: string
    logo: React.ElementType
    plan: string
    id: string
    role: string
    userCount: number
  }>>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  const fetchUserTenants = async () => {
    if (!user?.id) return

    try {
      const response = await axios.get('/api/user-tenants')
      const data = response.data

      // Get user counts for each tenant
      const workspacesData = await Promise.all(
        data.map(async (ut: { tenant: { name: string, id: string }, role: string, tenantId: string }) => {
          try {
            const countResponse = await axios.get(`/api/tenants/count/${ut.tenantId}`)
            const userCount = countResponse.data.count
            return {
              name: ut.tenant.name,
              logo: GalleryVerticalEnd, // Can customize based on tenant
              plan: ut.role === 'admin' ? 'Admin' : 'Member', // Simple mapping
              id: ut.tenantId,
              role: ut.role,
              userCount,
            }
          } catch {
            // If count fails, use default
            return {
              name: ut.tenant.name,
              logo: GalleryVerticalEnd,
              plan: ut.role === 'admin' ? 'Admin' : 'Member',
              id: ut.tenantId,
              role: ut.role,
              userCount: 1,
            }
          }
        })
      )
      setWorkspaces(workspacesData)
      setIsLoaded(true)
    } catch (error) {
      console.error('Error fetching user tenants:', error)
      setIsLoaded(true)
    }
  }

  React.useEffect(() => {
    fetchUserTenants()
  }, [user?.id])

  React.useEffect(() => {
    // Refresh workspaces when user changes
    if (isLoaded) {
      fetchUserTenants()
    }
  }, [user?.activeTenantId])

  if (!user) {
    return null // Or some loading state
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {isLoaded ? (
          <WorkspaceSwitcher workspaces={workspaces} onWorkspaceChange={fetchUserTenants} />
        ) : (
          <div className="h-14 animate-pulse bg-sidebar-accent rounded-md mx-1" />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
