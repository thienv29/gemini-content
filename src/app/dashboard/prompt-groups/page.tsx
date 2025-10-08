"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Plus, Edit, Trash } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { useConfirmation } from "@/core/providers/confirmation-provider"
import { PromptGroupForm } from "@/components/prompt-group-form"
import { useDebounce } from "@/hooks/use-debounce"
import { Loading } from "@/components/ui/loading"


interface PromptGroup {
  id: string
  name: string
  description?: string
  createdAt: string
  prompts: Array<{
    prompt: {
      id: string
      name: string
    }
  }>
  _count: {
    prompts: number
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function PromptGroupsPage() {
  const [promptGroups, setPromptGroups] = useState<PromptGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 500) // Debounce search by 500ms
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  })

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PromptGroup | null>(null)


  const { confirm } = useConfirmation()

  const columns: ColumnDef<PromptGroup>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={promptGroups.length > 0 && selectedGroups.size === promptGroups.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      cell: ({ row }) => {
        const group = row.original
        return (
          <input
            type="checkbox"
            checked={selectedGroups.has(group.id)}
            onChange={(e) => handleSelectGroup(group.id, e.target.checked)}
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
      accessorKey: "_count.prompts",
      header: "Prompts Count",
      cell: ({ row }) => {
        const count = row.getValue("_count.prompts") as number
        return <span>{count}</span>
      }
    },
    {
      accessorKey: "prompts",
      header: "Prompts",
      cell: ({ row }) => {
        const prompts = row.getValue("prompts") as PromptGroup["prompts"]
        return <span className="text-sm">
          {prompts.slice(0, 3).map(p => p.prompt.name).join(", ")}
          {prompts.length > 3 && ` +${prompts.length - 3} more`}
        </span>
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
        const group = row.original
        return (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(group)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(group)}
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

  const fetchPromptGroups = useCallback(async () => {
    setLoading(true) // Set loading to true when fetching
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: page.toString(),
        limit: limit.toString()
      })
      const response = await axios.get(`/api/prompt-groups?${params}`)
      const data = response.data
      setPromptGroups(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching prompt groups:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page, limit])

  useEffect(() => {
    fetchPromptGroups()
  }, [fetchPromptGroups])

  // Reset page to 1 when debounced search changes
  useEffect(() => {
    if (page !== 1) setPage(1)
  }, [debouncedSearch])

  const handleDelete = (group: PromptGroup) => {
    confirm({
      title: "Delete Prompt Group",
      description: `This will permanently delete the prompt group "${group.name}". This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/prompt-groups/${group.id}`)
          fetchPromptGroups() // Refresh data
        } catch (error) {
          console.error('Error deleting prompt group:', error)
        }
      }
    })
  }



  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit))
    setPage(1) // Reset to first page when changing limit
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleCreate = () => {
    setEditingGroup(null)
    setDialogOpen(true)
  }

  const handleEdit = (group: PromptGroup) => {
    setEditingGroup(group)
    setDialogOpen(true)
  }

  const handleFormSuccess = () => {
    fetchPromptGroups() // Refresh data
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingGroup(null)
  }

  // Selection state
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  const handleSelectGroup = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(groupId)
      } else {
        newSet.delete(groupId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(new Set(promptGroups.map(g => g.id)))
    } else {
      setSelectedGroups(new Set())
    }
  }

  const handleBulkDelete = () => {
    const selectedCount = selectedGroups.size
    const selectedNames = promptGroups.filter(g => selectedGroups.has(g.id)).map(g => g.name).join(", ")

    confirm({
      title: `Delete ${selectedCount} Prompt Group${selectedCount > 1 ? 's' : ''}`,
      description: `This will permanently delete the selected prompt groups: ${selectedNames}. This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await axios.post('/api/prompt-groups/bulk-delete', {
            ids: Array.from(selectedGroups)
          })
          setSelectedGroups(new Set()) // Clear selection
          fetchPromptGroups() // Refresh data
        } catch (error) {
          console.error('Error bulk deleting prompt groups:', error)
        }
      }
    })
  }

  // Clear selections when data changes
  useEffect(() => {
    setSelectedGroups(new Set())
  }, [promptGroups])

  if (loading && promptGroups.length === 0) {
    return (
      <Loading className="top-16"/>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompt Groups</h2>
          <div className="flex gap-2">
            {selectedGroups.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({selectedGroups.size})
              </Button>
            )}
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search groups..."
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
          data={promptGroups}
          totalPages={pagination.totalPages}
          currentPage={page}
          onPageChange={handlePageChange}
        />

        {/* Prompt Group Form Dialog */}
        <PromptGroupForm
          open={dialogOpen}
          onClose={handleDialogClose}
          editingGroup={editingGroup}
          onSuccess={handleFormSuccess}
        />


      </div>
    </div>
  )
}
