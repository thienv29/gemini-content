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
import { PlusCircle, Edit, Trash2, Settings } from 'lucide-react'

interface PromptSetting {
  id: string
  name: string
  description?: string
  items: Record<string, any>
  createdAt: string
  updatedAt: string
}

export default function PromptSettingsPage() {
  const { user } = useAuthStore()
  const [settings, setSettings] = useState<PromptSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<PromptSetting | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: '{}'
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/prompt-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching prompt settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      let items = {}
      try {
        items = JSON.parse(formData.items)
      } catch (err) {
        alert('Invalid JSON in items field')
        return
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        items
      }

      let response
      if (editingSetting) {
        response = await fetch(`/api/prompt-settings/${editingSetting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch('/api/prompt-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        await fetchSettings()
        resetForm()
        setDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'An error occurred')
      }
    } catch (error) {
      console.error('Error saving prompt setting:', error)
      alert('An error occurred while saving the prompt setting')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt setting?')) return

    try {
      const response = await fetch(`/api/prompt-settings/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchSettings()
      } else {
        alert('Error deleting prompt setting')
      }
    } catch (error) {
      console.error('Error deleting prompt setting:', error)
      alert('An error occurred while deleting the prompt setting')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      items: '{}'
    })
    setEditingSetting(null)
  }

  const openEditDialog = (setting: PromptSetting) => {
    setEditingSetting(setting)
    setFormData({
      name: setting.name,
      description: setting.description || '',
      items: JSON.stringify(setting.items, null, 2)
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
                <BreadcrumbPage>Prompt Settings</BreadcrumbPage>
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
          <h2 className="text-2xl font-semibold">Prompt Settings</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Setting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingSetting ? 'Edit Prompt Setting' : 'Add New Prompt Setting'}</DialogTitle>
                  <DialogDescription>
                    {editingSetting ? 'Update the setting details below.' : 'Create a new prompt setting for your workspace.'}
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
                    <Label htmlFor="items" className="text-right pt-2">
                      Items
                    </Label>
                    <Textarea
                      id="items"
                      value={formData.items}
                      onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                      className="col-span-3"
                      rows={6}
                      placeholder='{"setting1": "value1", "setting2": {"nested": "value"}, "arraySetting": ["item1", "item2"]}'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingSetting ? 'Update Setting' : 'Create Setting'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center">Loading prompt settings...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="truncate">{setting.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(setting)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(setting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center mb-2">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{Object.keys(setting.items).length} setting{Object.keys(setting.items).length !== 1 ? 's' : ''}</span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
                      {JSON.stringify(setting.items, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
