"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronsUpDown, Plus, Edit, Trash2 } from "lucide-react"
import axios from "axios"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"
import { TenantForm } from "@/components/tenant-form"
import { useConfirmation } from "@/core/providers/confirmation-provider"
import { useSession } from "next-auth/react";



interface Workspace {
  name: string
  logo: React.ElementType
  plan: string
  id: string
  role: string
  userCount: number
}

interface Tenant {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: Workspace[]
}) {
  const { isMobile } = useSidebar()
  const { user } = useAuthStore()
  const { confirm } = useConfirmation()
  const activeWorkspace = workspaces.find(w => w.id === user?.activeTenantId) || workspaces[0]

  const [tenantFormOpen, setTenantFormOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const { data: session, update } = useSession()
  if (!activeWorkspace) {
    return null
  }

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (user?.activeTenantId === workspaceId) return // Already on this workspace

    try {
      const response = await axios.patch('/api/user-tenants', { tenantId: workspaceId })
      console.log('API response:', response.data)
      // Session sẽ tự refresh on next API call,
      // mà chúng ta chỉ cần UI update ngay lập tức
      await update({
        user: {
          ...session?.user,
          activeTenantId: workspaceId
        },
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch workspace:', error)
    }
  }

  const handleEditTenant = (workspace: Workspace) => {
    const tenant: Tenant = {
      id: workspace.id,
      name: workspace.name,
      createdAt: '',
      updatedAt: '',
    }
    setEditingTenant(tenant)
    setTenantFormOpen(true)
  }

  const handleDeleteTenant = async (workspace: Workspace) => {
    if (workspace.userCount <= 1) {
      confirm({
        title: "Cannot delete workspace",
        description: "This workspace has only one user and cannot be deleted.",
        confirmText: "OK",
        onConfirm: () => { }, // No action needed, just close the dialog
      })
      return
    }

    confirm({
      title: "Delete workspace",
      description: `Are you sure you want to delete "${workspace.name}"? This action cannot be undone and will remove all associated prompts, settings, and user access.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/tenants/${workspace.id}`)
        } catch (error) {
          console.error('Failed to delete workspace:', error)
        }
      }
    })
  }

  const handleTenantFormSuccess = () => {
    setTenantFormOpen(false)
    setEditingTenant(null)
  }

  const handleCreateTenant = () => {
    setEditingTenant(null)
    setTenantFormOpen(true)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeWorkspace.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeWorkspace.name}</span>
                <span className="truncate text-xs">{activeWorkspace.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                className="gap-2 p-2"
                onClick={() => handleSwitchWorkspace(workspace.id)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <workspace.logo className="size-3.5 shrink-0" />
                </div>
                <span className="flex-1">{workspace.name}</span>
                {workspace.role === 'admin' && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()} className="ml-2 p-1">
                      <ChevronsUpDown className="h-3 w-3" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent sideOffset={2}>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleEditTenant(workspace)
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit workspace
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTenant(workspace)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete workspace
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleCreateTenant}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <TenantForm
        open={tenantFormOpen}
        onClose={() => setTenantFormOpen(false)}
        editingTenant={editingTenant}
        onSuccess={handleTenantFormSuccess}
      />
    </SidebarMenu>
  )
}
