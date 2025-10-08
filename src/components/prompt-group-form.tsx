"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface PromptGroupFormData {
  name: string
  description: string
}

interface PromptGroup {
  id: string
  name: string
  description?: string
}

interface PromptGroupFormProps {
  open: boolean
  onClose: () => void
  editingGroup?: PromptGroup | null
  initialData?: Partial<PromptGroup>
  onSuccess: () => void
}

export function PromptGroupForm({ open, onClose, editingGroup, initialData, onSuccess }: PromptGroupFormProps) {
  const [formData, setFormData] = useState<PromptGroupFormData>({
    name: initialData?.name || editingGroup?.name || "",
    description: initialData?.description || editingGroup?.description || ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Update form data when editingGroup or initialData changes
  useEffect(() => {
    setFormData({
      name: initialData?.name || editingGroup?.name || "",
      description: initialData?.description || editingGroup?.description || ""
    })
  }, [editingGroup, initialData])

  const handleChange = (field: keyof PromptGroupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const isEditing = !!editingGroup
      const url = isEditing ? `/api/prompt-groups/${editingGroup.id}` : '/api/prompt-groups'
      const method = isEditing ? 'put' : 'post'

      await axios({ method, url, data: formData })

      onSuccess()
      onClose()

      // Reset form
      setFormData({ name: "", description: "" })
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
      setFormData({ name: "", description: "" })
      setError("")
      onClose()
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", description: "" })
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingGroup ? 'Edit Prompt Group' : 'Create Prompt Group'}</DialogTitle>
          <DialogDescription>
            {editingGroup
              ? 'Update the prompt group details below.'
              : 'Create a new prompt group to organize your prompts.'
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
                placeholder="Enter group name"
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
                placeholder="Enter group description (optional)"
                className="col-span-3"
                rows={3}
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
              {editingGroup ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
