"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Trash, Search, Eye, GripVertical } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface PromptSettingFormData {
  name: string
  description: string
  items: {
    prompts: Array<{
      promptId: string
      position: number
    }>
  }
}

interface PromptSetting {
  id: string
  name: string
  description?: string
  items: any
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

interface PromptGroup {
  id: string
  name: string
}

interface PromptSettingFormProps {
  open: boolean
  onClose: () => void
  editingSetting?: PromptSetting | null
  initialData?: Partial<PromptSetting>
  onSuccess: () => void
}

export function PromptSettingForm({ open, onClose, editingSetting, initialData, onSuccess }: PromptSettingFormProps) {
  const [formData, setFormData] = useState<PromptSettingFormData>({
    name: initialData?.name || editingSetting?.name || "",
    description: initialData?.description || editingSetting?.description || "",
    items: initialData?.items || editingSetting?.items || { prompts: [] }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([])
  const [availableGroups, setAvailableGroups] = useState<PromptGroup[]>([])
  const [promptSearch, setPromptSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const debouncedSearch = useDebounce(promptSearch, 300)

  // Update form data when editingSetting or initialData changes
  useEffect(() => {
    setFormData({
      name: initialData?.name || editingSetting?.name || "",
      description: initialData?.description || editingSetting?.description || "",
      items: initialData?.items || editingSetting?.items || { prompts: [] }
    })
  }, [editingSetting, initialData])

  // Fetch available prompts and groups
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [promptsResponse, groupsResponse] = await Promise.all([
            axios.get('/api/prompts', {
              params: {
                search: debouncedSearch,
                limit: 100 // Fetch more for selection
              }
            }),
            axios.get('/api/prompt-groups')
          ])
          setAvailablePrompts(promptsResponse.data.data)
          setAvailableGroups(groupsResponse.data.data)
        } catch (err) {
          console.error('Failed to fetch data:', err)
        }
      }
      fetchData()
    }
  }, [open, debouncedSearch])

  // Filter prompts by selected group
  const filteredPrompts = availablePrompts.filter(prompt => {
    if (!selectedGroup) return true
    return prompt.groups.some(g => g.group.id === selectedGroup)
  })

  const handleChange = (field: keyof PromptSettingFormData, value: string) => {
    if (field === 'name' || field === 'description') {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const addPrompt = (promptId: string) => {
    if (formData.items.prompts.some(p => p.promptId === promptId)) return

    const maxPosition = Math.max(0, ...formData.items.prompts.map(p => p.position))
    setFormData(prev => ({
      ...prev,
      items: {
        prompts: [
          ...prev.items.prompts,
          { promptId, position: maxPosition + 1 }
        ].sort((a, b) => a.position - b.position)
      }
    }))
  }

  const removePrompt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: {
        prompts: prev.items.prompts.filter((_, i) => i !== index)
      }
    }))
  }

  const updatePosition = (index: number, position: number) => {
    setFormData(prev => {
      const newPrompts = [...prev.items.prompts]
      newPrompts[index] = { ...newPrompts[index], position }
      return {
        ...prev,
        items: {
          prompts: newPrompts.sort((a, b) => a.position - b.position)
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const isEditing = !!editingSetting
      const url = isEditing ? `/api/prompt-settings/${editingSetting.id}` : '/api/prompt-settings'
      const method = isEditing ? 'put' : 'post'

      await axios({ method, url, data: formData })

      onSuccess()
      onClose()

      // Reset form
      setFormData({ name: "", description: "", items: { prompts: [] } })
      setPromptSearch("")
      setSelectedGroup("")
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
      setFormData({ name: "", description: "", items: { prompts: [] } })
      setError("")
      setPromptSearch("")
      setSelectedGroup("")
      onClose()
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", description: "", items: { prompts: [] } })
    setError("")
    setPromptSearch("")
    setSelectedGroup("")
    onClose()
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    setFormData(prev => {
      const newPrompts = [...prev.items.prompts]
      const draggedPrompt = newPrompts[draggedIndex]

      // Remove dragged item
      newPrompts.splice(draggedIndex, 1)

      // Insert at drop index
      newPrompts.splice(dropIndex, 0, draggedPrompt)

      // Update positions
      const updatedPrompts = newPrompts.map((prompt, index) => ({
        ...prompt,
        position: index + 1
      }))

      return {
        ...prev,
        items: {
          prompts: updatedPrompts
        }
      }
    })

    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Generate merged content preview
  const generatePreview = () => {
    const sortedPrompts = formData.items.prompts
      .sort((a, b) => a.position - b.position)
      .map(selectedPrompt => {
        const prompt = availablePrompts.find(p => p.id === selectedPrompt.promptId)
        return prompt
      })
      .filter(Boolean)

    const mergedContent = sortedPrompts.map(prompt => prompt!.content).join('')
    const allVariables = [...new Set(sortedPrompts.flatMap(prompt => Object.keys(prompt!.variables)))]

    return { mergedContent, allVariables, prompts: sortedPrompts }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-auto flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editingSetting ? 'Edit Prompt Setting' : 'Create Prompt Setting'}</DialogTitle>
          <DialogDescription>
            {editingSetting
              ? 'Update the prompt setting details below.'
              : 'Create a new prompt setting with selected prompts and their positions.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex gap-6 flex-1 min-h-0 py-4">
            {/* Left Column - Selected Prompts */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label>Selected Prompts ({formData.items.prompts.length})</Label>
                {formData.items.prompts.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                )}
              </div>
              <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-background min-h-[300px]">
                <div className="space-y-2">
                  {formData.items.prompts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No prompts selected. Use the search on the right to add prompts.
                    </p>
                  )}
                  {formData.items.prompts.map((selectedPrompt, index) => {
                    const prompt = availablePrompts.find(p => p.id === selectedPrompt.promptId)
                    return (
                      <div
                        key={`item-${selectedPrompt.promptId}-${index}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 p-3 border rounded cursor-move transition-all duration-200 ${
                          draggedIndex !== null ? 'bg-muted/50' : 'hover:bg-muted/30'
                        }`}
                      >
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-move">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{prompt?.name || 'Loading...'}</div>
                          {prompt?.description && (
                            <div className="text-xs text-muted-foreground">{prompt.description}</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePrompt(index)}
                          className="h-8"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Search and Selection */}
            <div className="flex-1 space-y-4 flex flex-col">
              {/* Name and Description */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="mb-2">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter setting name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="mb-2">Description</Label>
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

              {/* Search Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <Label className="mb-2">Add Prompts</Label>
                <div className="space-y-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search prompts by name or description..."
                      value={promptSearch}
                      onChange={(e) => setPromptSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">All groups</option>
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-background min-h-0 mt-2">
                  <div className="space-y-2">
                    {filteredPrompts
                      .filter(prompt => !formData.items.prompts.some(p => p.promptId === prompt.id))
                      .map((prompt) => (
                      <div key={prompt.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{prompt.name}</div>
                          {prompt.description && (
                            <div className="text-xs text-muted-foreground truncate">{prompt.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Groups: {prompt.groups.map(g => g.group.name).join(', ')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addPrompt(prompt.id)}
                          className="h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                    {filteredPrompts.filter(prompt => !formData.items.prompts.some(p => p.promptId === prompt.id)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No prompts available to add.
                      </p>
                    )}
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
              {editingSetting ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => {
          if (!open) {
            setVariableValues({})
          }
          setPreviewOpen(open)
        }}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Interactive Prompt Preview</DialogTitle>
              <DialogDescription>
                Fill in variables on the right, and see them applied to the merged content on the left.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const preview = generatePreview()
              const allVariables = preview.allVariables
              const mergedContent = preview.mergedContent

              // Replace variables in content
              let processedContent = mergedContent
              Object.entries(variableValues).forEach(([key, value]) => {
                if (value.trim()) {
                  const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
                  processedContent = processedContent.replace(regex, value)
                }
              })

              return (
                <div className="flex gap-6 min-h-[500px]">
                  {/* Left Column - Merged Content */}
                  <div className="flex-1 flex flex-col">
                    <Label className="mb-2">Merged Content</Label>
                    <Textarea
                      readOnly
                      value={processedContent}
                      className="flex-1 font-mono text-sm resize-none"
                      placeholder="No content to preview"
                    />
                  </div>

                  {/* Right Column - Variables Form */}
                  <div className="w-80 flex flex-col">
                    <Label className="mb-2">Variables Form</Label>
                    <div className="flex-1 border rounded-md p-4 space-y-4 overflow-y-auto">
                      {allVariables.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No variables required</span>
                      ) : (
                        allVariables.map((variable) => (
                          <div key={variable}>
                            <Label htmlFor={`var-${variable}`} className="text-sm font-mono">
                              {variable}
                            </Label>
                            <Input
                              id={`var-${variable}`}
                              value={variableValues[variable] || ''}
                              onChange={(e) => setVariableValues(prev => ({
                                ...prev,
                                [variable]: e.target.value
                              }))}
                              className="mt-1"
                              placeholder={`Enter value for ${variable}`}
                            />
                          </div>
                        ))
                      )}

                      {/* Clear All Button */}
                      {allVariables.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setVariableValues({})}
                          className="w-full mt-4"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            <DialogFooter>
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
