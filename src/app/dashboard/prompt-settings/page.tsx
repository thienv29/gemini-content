"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import axios from "axios"
import { Plus, Edit, Trash, Copy } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"

import { useConfirmation } from "@/core/providers/confirmation-provider"
import { PromptSettingForm } from "@/components/prompt-setting-form"
import { useBulkDelete } from "@/hooks/use-bulk-delete"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"


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

  const { confirm } = useConfirmation()

  // Form states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<PromptSetting | null>(null)
  const [cloningSetting, setCloningSetting] = useState<Partial<PromptSetting> | null>(null)

  // Bulk delete functionality using shared hook
  const bulkDelete = useBulkDelete({
    data: promptSettings,
    idKey: 'id',
    apiPath: '/api/prompt-settings',
    entityName: 'prompt setting'
  })

  const columns: ColumnDef<PromptSetting>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={bulkDelete.isAllSelected}
          onCheckedChange={(checked) => bulkDelete.handleSelectAll(!!checked)}
        />
      ),
      cell: ({ row }) => {
        const setting = row.original
        return (
          <Checkbox
            checked={bulkDelete.selectedItems.has(setting.id)}
            onCheckedChange={(checked) => bulkDelete.handleSelectItem(setting.id, !!checked)}
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
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const setting = row.original
        return (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClone(setting)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(setting)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(setting)}
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
    bulkDelete.handleBulkDelete((selectedSettingsData: PromptSetting[], action: 'delete' | 'undo') => {
      if (action === 'delete') {
        // Optimistic delete: remove the item from UI
        setPromptSettings(prev => prev.filter(s => s.id !== setting.id))
      } else if (action === 'undo') {
        // Undo: add back the item
        setPromptSettings(prev => [...prev, ...selectedSettingsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      }
    }, fetchPromptSettings, [setting.id])
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

  const handleCreate = () => {
    setEditingSetting(null)
    setCloningSetting(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (setting: PromptSetting) => {
    setEditingSetting(setting)
    setCloningSetting(null)
    setFormDialogOpen(true)
  }

  const handleClone = (setting: PromptSetting) => {
    const { id, createdAt, ...clonedData } = setting
    const clonedSetting = {
      ...clonedData,
      name: `${setting.name} (Clone)`
    }
    setEditingSetting(null)
    setCloningSetting(clonedSetting)
    setFormDialogOpen(true)
  }

  const handleFormSuccess = () => {
    setFormDialogOpen(false)
    setEditingSetting(null)
    setCloningSetting(null)
    fetchPromptSettings()
  }



  // Clear selections when data changes
  useEffect(() => {
    bulkDelete.resetSelection()
  }, [promptSettings])

  if (loading && promptSettings.length === 0) {
    return (
      <Loading message="Loading prompt settings..." className="top-16" />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Prompt Settings</h2>
          <div className="flex gap-2">
            {bulkDelete.selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => bulkDelete.handleBulkDelete(
                  (selectedSettingsData: PromptSetting[], action: 'delete' | 'undo') => {
                    if (action === 'delete') {
                      setPromptSettings(prev => prev.filter(s => !bulkDelete.selectedItems.has(s.id)))
                    } else if (action === 'undo') {
                      setPromptSettings(prev => [...prev, ...selectedSettingsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
                    }
                  },
                  fetchPromptSettings
                )}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({bulkDelete.selectedCount})
              </Button>
            )}
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Setting
            </Button>
          </div>
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



        {/* Prompt Setting Form Dialog */}
        <PromptSettingForm
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          editingSetting={editingSetting}
          initialData={cloningSetting || undefined}
          onSuccess={handleFormSuccess}
        />
      </div>
    </div>
  )
}
