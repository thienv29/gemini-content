"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface PromptFormData {
  name: string
  description: string
  content: string
  variables: Record<string, unknown>
  groups: string[]
}

interface PromptGroup {
  id: string
  name: string
  description?: string
}

interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  variables: Record<string, unknown>
  groups: Array<{
    group: {
      id: string
      name: string
    }
  }>
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
    variables: editingPrompt?.variables || {},
    groups: editingPrompt?.groups.map(g => g.group.id) || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [availableGroups, setAvailableGroups] = useState<PromptGroup[]>([])
  const [groupSearch, setGroupSearch] = useState("")

  // Filter groups based on search
  const filteredGroups = availableGroups.filter(group =>
    group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
  )

  // Update form data when editingPrompt changes
  useEffect(() => {
    setFormData({
      name: editingPrompt?.name || "",
      description: editingPrompt?.description || "",
      content: editingPrompt?.content || "",
      variables: editingPrompt?.variables || {},
      groups: editingPrompt?.groups.map(g => g.group.id) || []
    })
  }, [editingPrompt])

  // Fetch available groups
  useEffect(() => {
    if (open) {
      const fetchGroups = async () => {
        try {
          const response = await axios.get('/api/prompt-groups')
          setAvailableGroups(response.data.data)
        } catch (err) {
          console.error('Failed to fetch groups:', err)
        }
      }
      fetchGroups()
    }
  }, [open])

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

  const handleGroupChange = (groupId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      groups: checked
        ? [...prev.groups, groupId]
        : prev.groups.filter(id => id !== groupId)
    }))
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
      setFormData({ name: "", description: "", content: "", variables: {}, groups: [] })
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
      setFormData({ name: "", description: "", content: "", variables: {}, groups: [] })
      setError("")
      onClose()
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", description: "", content: "", variables: {}, groups: [] })
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Create Prompt'}</DialogTitle>
          <DialogDescription>
            {editingPrompt
              ? 'Update the prompt details below.'
              : 'Create a new prompt to use in your applications.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Main Content Area with Two Columns */}
          <div className="flex gap-6 flex-1 min-h-0 py-4">
            {/* Left Column - Content (Primary Editing Area) */}
            <div className="flex-1 flex flex-col">
              <Label htmlFor="content" className="mb-2">Prompt Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter your prompt content here..."
                className="flex-1 min-h-[400px] resize-none"
                required
              />
            </div>

            {/* Right Column - Secondary Fields */}
            <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
              {/* Name and Description at top */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter prompt name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter brief description (optional)"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Variables */}
              <div className="flex-1 flex flex-col min-h-0">
                <Label htmlFor="variables" className="mb-2">Variables</Label>
                <Textarea
                  id="variables"
                  value={JSON.stringify(formData.variables, null, 2)}
                  onChange={(e) => handleVariablesChange(e.target.value)}
                  placeholder='{"key": "default_value"}'
                  className="flex-1 min-h-[120px] resize-none"
                />
              </div>

              {/* Groups Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <Label className="mb-2">Groups</Label>
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <Input
                    placeholder="Search groups..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="h-9 flex-shrink-0"
                  />
                  <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-background min-h-0">
                    <div className="space-y-2">
                      {filteredGroups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={formData.groups.includes(group.id)}
                            onCheckedChange={(checked) => handleGroupChange(group.id, checked as boolean)}
                          />
                          <Label htmlFor={`group-${group.id}`} className="text-sm flex-1">
                            {group.name}
                            {group.description && (
                              <span className="text-muted-foreground ml-2">
                                - {group.description}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                      {filteredGroups.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {availableGroups.length === 0 ? "No groups available" : "No groups match your search"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive text-center py-2 flex-shrink-0">
              {error}
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
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
