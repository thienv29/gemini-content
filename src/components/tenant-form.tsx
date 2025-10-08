"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Trash2 } from "lucide-react"

interface Tenant {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface TenantFormProps {
  open: boolean
  onClose: () => void
  editingTenant?: Tenant | null
  onSuccess: () => void
  onDelete?: () => void
}

export function TenantForm({ open, onClose, editingTenant, onSuccess, onDelete }: TenantFormProps) {
  const [name, setName] = useState(editingTenant?.name || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Update form data when editingTenant changes
  useEffect(() => {
    setName(editingTenant?.name || "")
  }, [editingTenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const isEditing = !!editingTenant
      const url = isEditing ? `/api/tenants/${editingTenant.id}` : '/api/tenants/create'
      const method = isEditing ? 'put' : 'post'

      await axios({ method, url, data: { name } })

      onSuccess()
      onClose()

      // Reset form
      setName("")
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
      setName("")
      setError("")
      onClose()
    }
  }

  const handleCancel = () => {
    setName("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingTenant ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
          <DialogDescription>
            {editingTenant
              ? 'Update the workspace name below.'
              : 'Create a new workspace to organize your prompts and settings.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workspace name"
                className="col-span-3"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive text-center py-2">
              {error}
            </div>
          )}

          <DialogFooter>
            {editingTenant && onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTenant ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
