"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Plus, Edit, Trash } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"

import { Loading } from "@/components/ui/loading"
import { PromptForm } from "@/components/prompt-form"
import { useConfirmation } from "@/core/providers/confirmation-provider"


interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  variables: Record<string, unknown>
  createdAt: string
  groups: Array<{
    group: {
      id: string
      name: string
    }
  }>
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  })

  // Form states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  // Selection states
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set())

  const { confirm } = useConfirmation()

  const columns: ColumnDef<Prompt>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={prompts.length > 0 && selectedPrompts.size === prompts.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      cell: ({ row }) => {
        const prompt = row.original
        return (
          <input
            type="checkbox"
            checked={selectedPrompts.has(prompt.id)}
            onChange={(e) => handleSelectPrompt(prompt.id, e.target.checked)}
          />
        )
      },
      size: 50
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return <span className="text-sm text-muted-foreground">
          {description?.length > 50 ? `${description.substring(0, 50)}...` : description}
        </span>
      }
    },
    {
      accessorKey: "groups",
      header: "Groups",
      cell: ({ row }) => {
        const groups = row.getValue("groups") as Prompt["groups"]
        return <span>{groups.length}</span>
      }
    },
    {
      accessorKey: "variables",
      header: "Variables",
      cell: ({ row }) => {
        const variables = row.getValue("variables") as Record<string, unknown>
        return <span>{Object.keys(variables).length}</span>
      }
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return <span className="text-sm">{date.toLocaleDateString()}</span>
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const prompt = row.original
        return (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(prompt)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(prompt)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )
      },
      size: 100
    }
  ]

  const fetchPrompts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString()
      })
      const response = await axios.get(`/api/prompts?${params}`)
      const data = response.data
      setPrompts(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page, limit])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  // Clear selections when data changes (pagination, search, etc.)
  useEffect(() => {
    setSelectedPrompts(new Set())
  }, [prompts])

  const handleDelete = (prompt: Prompt) => {
    confirm({
      title: "Delete Prompt",
      description: `This will permanently delete the prompt "${prompt.name}". This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/prompts/${prompt.id}`)
          fetchPrompts() // Refresh data
        } catch (error) {
          console.error('Error deleting prompt:', error)
        }
      }
    })
  }

  const handleCreate = () => {
    setEditingPrompt(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setFormDialogOpen(true)
  }

  const handleFormSuccess = () => {
    setFormDialogOpen(false)
    setEditingPrompt(null)
    fetchPrompts() // Refresh data
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page when searching
  }

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit))
    setPage(1) // Reset to first page when changing limit
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleSelectPrompt = (promptId: string, checked: boolean) => {
    setSelectedPrompts(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(promptId)
      } else {
        newSet.delete(promptId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(prompts.map(p => p.id)))
    } else {
      setSelectedPrompts(new Set())
    }
  }

  const handleBulkDelete = () => {
    const selectedCount = selectedPrompts.size
    const selectedNames = prompts.filter(p => selectedPrompts.has(p.id)).map(p => p.name).join(", ")

    confirm({
      title: `Delete ${selectedCount} Prompt${selectedCount > 1 ? 's' : ''}`,
      description: `This will permanently delete the selected prompts: ${selectedNames}. This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await axios.post('/api/prompts/bulk-delete', {
            ids: Array.from(selectedPrompts)
          })
          setSelectedPrompts(new Set()) // Clear selection
          fetchPrompts() // Refresh data
        } catch (error) {
          console.error('Error bulk deleting prompts:', error)
        }
      }
    })
  }



  if (loading && prompts.length === 0) {
    return (
      <Loading className="top-16"/>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompts</h2>
          <div className="flex gap-2">
            {selectedPrompts.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({selectedPrompts.size})
              </Button>
            )}
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create Prompt
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search prompts..."
              className="w-80"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={prompts}
          totalPages={pagination.totalPages}
          currentPage={page}
          onPageChange={handlePageChange}
        />

        {/* Prompt Form Dialog */}
        <PromptForm
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          editingPrompt={editingPrompt}
          onSuccess={handleFormSuccess}
        />
      </div>
    </div>
  )
}
