"use client"

import React, { useState, useEffect } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/ui/shadcn-io/theme-switcher"
import { useAuthStore } from "@/stores/auth-store"
import { PlusCircle, Edit, Trash2, Users } from 'lucide-react'

interface PromptGroup {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count: {
    prompts: number
  }
  prompts: Array<{
    prompt: {
      id: string
      name: string
    }
  }>
}

export default function PromptGroupsPage() {
  const { user } = useAuthStore()
  const [promptGroups, setPromptGroups] = useState<PromptGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PromptGroup | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchPromptGroups()
  }, [])

  const fetchPromptGroups = async () => {
    try {
      const response = await fetch('/api/prompt-groups')
      if (response.ok) {
        const data = await response.json()
        setPromptGroups(data)
      }
    } catch (error) {
      console.error('Error fetching prompt groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        description: formData.description
      }

      let response
      if (editingGroup) {
        response = await fetch(`/api/prompt-groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch('/api/prompt-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        await fetchPromptGroups()
        resetForm()
        setDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'An error occurred')
      }
    } catch (error) {
      console.error('Error saving prompt group:', error)
      alert('An error occurred while saving the prompt group')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt group?')) return

    try {
      const response = await fetch(`/api/prompt-groups/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPromptGroups()
      } else {
        alert('Error deleting prompt group')
      }
    } catch (error) {
      console.error('Error deleting prompt group:', error)
      alert('An error occurred while deleting the prompt group')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    })
    setEditingGroup(null)
  }

  const openEditDialog = (group: PromptGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || ''
    })
    setDialogOpen(true)
  }



  return (
    <>
      <header className="flex justify-between px-4 h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Prompt Groups</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="scale-110" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompt Groups</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingGroup ? 'Edit Prompt Group' : 'Add New Prompt Group'}</DialogTitle>
                  <DialogDescription>
                    {editingGroup ? 'Update the group details below.' : 'Create a new group for organizing your prompts.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="col-span-3"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center">Loading prompt groups...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {promptGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="truncate">{group.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {group._count.prompts} prompt{group._count.prompts !== 1 ? 's' : ''}
                  </div>
                  {group.prompts.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Recent prompts:</p>
                      <div className="space-y-1">
                        {group.prompts.slice(0, 3).map(({ prompt }) => (
                          <div key={prompt.id} className="text-xs truncate text-muted-foreground">
                            • {prompt.name}
                          </div>
                        ))}
                        {group.prompts.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{group.prompts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
