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


interface PromptSetting {
  id: string
  name: string
  description?: string
  items: Record<string, unknown>
  createdAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function PromptSettingsPage() {
  const [promptSettings, setPromptSettings] = useState<PromptSetting[]>([])
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

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [settingToDelete, setSettingToDelete] = useState<PromptSetting | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const columns: ColumnDef<PromptSetting>[] = [
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
      accessorKey: "items",
      header: "Config Items",
      cell: ({ row }) => {
        const items = row.getValue("items") as Record<string, unknown>
        const keys = Object.keys(items)
        return <span className="text-sm">
          {keys.length} item{keys.length !== 1 ? 's' : ''}: {keys.slice(0, 2).join(", ")}{keys.length > 2 && ` +${keys.length - 2} more`}
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
        const setting = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4" />
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(setting)}
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

  const fetchPromptSettings = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString()
      })
      const response = await axios.get(`/api/prompt-settings?${params}`)
      const data = response.data
      setPromptSettings(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching prompt settings:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page, limit])

  useEffect(() => {
    fetchPromptSettings()
  }, [fetchPromptSettings])

  const handleDelete = (setting: PromptSetting) => {
    setSettingToDelete(setting)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!settingToDelete) return

    setDeleteLoading(true)
    try {
      await axios.delete(`/api/prompt-settings/${settingToDelete.id}`)
      fetchPromptSettings() // Refresh data
      setDeleteDialogOpen(false)
      setSettingToDelete(null)
    } catch (error) {
      console.error('Error deleting prompt setting:', error)
    } finally {
      setDeleteLoading(false)
    }
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



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading prompt settings...</div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompt Settings</h2>
          <Button>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search settings..."
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
          data={promptSettings}
          totalPages={pagination.totalPages}
          currentPage={page}
          onPageChange={handlePageChange}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Prompt Setting"
          description={`This will permanently delete the prompt setting "${settingToDelete?.name}". This action cannot be undone.`}
          variant="destructive"
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  )
}
