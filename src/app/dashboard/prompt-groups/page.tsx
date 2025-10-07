"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Plus, Edit, Trash } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { PromptGroupForm } from "@/components/prompt-group-form"
import { useDebounce } from "@/hooks/use-debounce"
import { Spinner } from "@/components/ui/spinner"


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

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<PromptGroup | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const columns: ColumnDef<PromptGroup>[] = [
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
      header: "Actions",
      cell: ({ row }) => {
        const group = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(group)}>
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(group)}
              >
                <Trash className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
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
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return

    setDeleteLoading(true)
    try {
      await axios.delete(`/api/prompt-groups/${groupToDelete.id}`)
      fetchPromptGroups() // Refresh data
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
    } catch (error) {
      console.error('Error deleting prompt group:', error)
    } finally {
      setDeleteLoading(false)
    }
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



  if (loading && promptGroups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">Loading prompt groups...</div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompt Groups</h2>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
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
        <div className="relative">
          <DataTable
            columns={columns}
            data={promptGroups}
            totalPages={pagination.totalPages}
            currentPage={page}
            onPageChange={handlePageChange}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Spinner size={24} />
            </div>
          )}
        </div>

        {/* Prompt Group Form Dialog */}
        <PromptGroupForm
          open={dialogOpen}
          onClose={handleDialogClose}
          editingGroup={editingGroup}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Prompt Group"
          description={`This will permanently delete the prompt group "${groupToDelete?.name}". This action cannot be undone.`}
          variant="destructive"
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  )
}
