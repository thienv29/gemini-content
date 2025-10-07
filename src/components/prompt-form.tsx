"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface PromptFormData {
  name: string
  description: string
  content: string
  variables: Record<string, unknown>
}

interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  variables: Record<string, unknown>
}

interface PromptFormProps {
  open: boolean
  onClose: () => void
  editingPrompt?: Prompt | null
  onSuccess: () => void
}

export function PromptForm({ open, onClose, editingPrompt, onSuccess }: PromptFormProps) {
  const [formData, setFormData] = useState<PromptFormData>({
    name: editingPrompt?.name || "",
    description: editingPrompt?.description || "",
    content: editingPrompt?.content || "",
    variables: editingPrompt?.variables || {}
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Update form data when editingPrompt changes
  useEffect(() => {
    setFormData({
      name: editingPrompt?.name || "",
      description: editingPrompt?.description || "",
      content: editingPrompt?.content || "",
      variables: editingPrompt?.variables || {}
    })
  }, [editingPrompt])

  const handleChange = (field: keyof PromptFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVariablesChange = (value: string) => {
    try {
      const variables = value ? JSON.parse(value) : {}
      setFormData(prev => ({ ...prev, variables }))
    } catch (e) {
      // Invalid JSON, keep the current variables
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const isEditing = !!editingPrompt
      const url = isEditing ? `/api/prompts/${editingPrompt.id}` : '/api/prompts'
      const method = isEditing ? 'put' : 'post'

      await axios({ method, url, data: formData })

      onSuccess()
      onClose()

      // Reset form
      setFormData({ name: "", description: "", content: "", variables: {} })
    } catch (err) {
      let message = "An error occurred"
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message
      } else if (err instanceof Error) {
        message = err.message
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setFormData({ name: "", description: "", content: "", variables: {} })
      setError("")
      onClose()
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", description: "", content: "", variables: {} })
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Create Prompt'}</DialogTitle>
          <DialogDescription>
            {editingPrompt
              ? 'Update the prompt details below.'
              : 'Create a new prompt to use in your applications.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter prompt name"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter prompt description (optional)"
                className="col-span-3"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter prompt content"
                className="col-span-3"
                rows={8}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="variables" className="text-right pt-2">Variables</Label>
              <Textarea
                id="variables"
                value={JSON.stringify(formData.variables, null, 2)}
                onChange={(e) => handleVariablesChange(e.target.value)}
                placeholder='{"key": "default_value"}'
                className="col-span-3"
                rows={4}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive text-center col-span-4">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
