"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
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
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"
import { prisma } from "@/lib/prisma"

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
      isActive: true,
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
          title: "Team",
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
  const [teams, setTeams] = React.useState<Array<{
    name: string
    logo: React.ElementType
    plan: string
    id: string
  }>>([])

  React.useEffect(() => {
    if (user?.id) {
      // Fetch user's tenants
      const fetchUserTenants = async () => {
        try {
          const userTenants = await fetch(`/api/user-tenants?userId=${user.id}`)
          const data = await userTenants.json()
          const teamsData = data.map((ut: { tenant: { name: string }, role: string, tenantId: string }) => ({
            name: ut.tenant.name,
            logo: GalleryVerticalEnd, // Can customize based on tenant
            plan: ut.role === 'admin' ? 'Admin' : 'Member', // Simple mapping
            id: ut.tenantId
          }))
          setTeams(teamsData)
        } catch (error) {
          console.error('Error fetching user tenants:', error)
        }
      }
      fetchUserTenants()
    }
  }, [user?.id])

  if (!user) {
    return null // Or some loading state
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
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
