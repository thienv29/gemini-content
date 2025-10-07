"use client"

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
import { PlusCircle, Edit, Trash2 } from 'lucide-react'

interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  variables: Record<string, any>
  createdAt: string
  updatedAt: string
  groups: Array<{
    group: {
      id: string
      name: string
    }
  }>
}

export default function PromptsPage() {
  const { user } = useAuthStore()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    variables: '{}'
  })

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts')
      if (response.ok) {
        const data = await response.json()
        setPrompts(data)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      let variables = {}
      try {
        variables = JSON.parse(formData.variables)
      } catch (err) {
        alert('Invalid JSON in variables field')
        return
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        content: formData.content,
        variables
      }

      let response
      if (editingPrompt) {
        response = await fetch(`/api/prompts/${editingPrompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        await fetchPrompts()
        resetForm()
        setDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'An error occurred')
      }
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('An error occurred while saving the prompt')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPrompts()
      } else {
        alert('Error deleting prompt')
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      alert('An error occurred while deleting the prompt')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      variables: '{}'
    })
    setEditingPrompt(null)
  }

  const openEditDialog = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      content: prompt.content,
      variables: JSON.stringify(prompt.variables, null, 2)
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
                <BreadcrumbPage>Prompts</BreadcrumbPage>
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
          <h2 className="text-2xl font-semibold">Prompts</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle>
                  <DialogDescription>
                    {editingPrompt ? 'Update the prompt details below.' : 'Create a new prompt for your workspace.'}
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
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="content" className="text-right pt-2">
                      Content
                    </Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="col-span-3"
                      rows={6}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="variables" className="text-right pt-2">
                      Variables
                    </Label>
                    <Textarea
                      id="variables"
                      value={formData.variables}
                      onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                      className="col-span-3"
                      rows={3}
                      placeholder='{"key": "value", "anotherKey": ["array", "values"]}'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center">Loading prompts...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="truncate">{prompt.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(prompt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {prompt.content}
                  </div>
                  {prompt.groups.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Groups:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prompt.groups.map(({ group }) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted"
                          >
                            {group.name}
                          </span>
                        ))}
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
