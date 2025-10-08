"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Plus, Edit, Trash, Copy } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { useConfirmation } from "@/core/providers/confirmation-provider"
import { PromptGroupForm } from "@/components/prompt-group-form"
import { useDebounce } from "@/hooks/use-debounce"
import { useBulkDelete } from "@/hooks/use-bulk-delete"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"


interface PromptGroup {
  id: string
  name: string
  description?: string
  createdAt: string
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
  const [cloningGroup, setCloningGroup] = useState<Partial<PromptGroup> | null>(null)


  const { confirm } = useConfirmation()

  // Bulk delete functionality using shared hook
  const bulkDelete = useBulkDelete({
    data: promptGroups,
    idKey: 'id',
    apiPath: '/api/prompt-groups',
    entityName: 'prompt group'
  })

  const columns: ColumnDef<PromptGroup>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={bulkDelete.isAllSelected}
          onChange={(e) => bulkDelete.handleSelectAll(e.target.checked)}
        />
      ),
      cell: ({ row }) => {
        const group = row.original
        return (
          <input
            type="checkbox"
            checked={bulkDelete.selectedItems.has(group.id)}
            onChange={(e) => bulkDelete.handleSelectItem(group.id, e.target.checked)}
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
      header: "Prompts Count",
      cell: ({ row }) => {
        const count = row.original._count?.prompts || 0
        return <span>{count}</span>
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
              onClick={() => handleClone(group)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
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
    // Optimistically remove from UI
    setPromptGroups(prev => prev.filter(g => g.id !== group.id))

    // Delete from backend after a delay (if not undone)
    const timeoutId = setTimeout(async () => {
      try {
        await axios.delete(`/api/prompt-groups/${group.id}`)
      } catch (error) {
        console.error('Error deleting prompt group:', error)
      }
    }, 3000) // 3 seconds delay

    toast(`Prompt group "${group.name}" deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          // Cancel the delete and restore the group in UI
          clearTimeout(timeoutId)
          setPromptGroups(prev => [...prev, group].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
          toast.success("Deletion cancelled")
        },
      },
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
    setCloningGroup(null)
    setDialogOpen(true)
  }

  const handleEdit = (group: PromptGroup) => {
    setEditingGroup(group)
    setCloningGroup(null)
    setDialogOpen(true)
  }

  const handleClone = (group: PromptGroup) => {
    const { id, createdAt, ...clonedData } = group
    const clonedGroup = {
      ...clonedData,
      name: `${group.name} (Clone)`
    }
    setEditingGroup(null)
    setCloningGroup(clonedGroup)
    setDialogOpen(true)
  }

  const handleFormSuccess = () => {
    setDialogOpen(false)
    setEditingGroup(null)
    setCloningGroup(null)
    fetchPromptGroups() // Refresh data
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingGroup(null)
    setCloningGroup(null)
  }



  // Clear selections when data changes
  useEffect(() => {
    bulkDelete.resetSelection()
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
            {bulkDelete.selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => bulkDelete.handleBulkDelete((selectedGroupsData: PromptGroup[]) => {
                  if (selectedGroupsData.length > 0) {
                    setPromptGroups(prev => [...prev, ...selectedGroupsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
                  } else {
                    setPromptGroups(prev => prev.filter(g => !bulkDelete.selectedItems.has(g.id)))
                  }
                })}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({bulkDelete.selectedCount})
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
          initialData={cloningGroup || undefined}
          onSuccess={handleFormSuccess}
        />


      </div>
    </div>
  )
}
