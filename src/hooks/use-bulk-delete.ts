import { useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

interface UseBulkDeleteOptions<T> {
  data: T[]
  idKey: keyof T
  apiPath: string
  entityName: string
  nameKey?: keyof T
  onSuccess?: () => void
}

export function useBulkDelete<T extends Record<string, any>>({
  data,
  idKey,
  apiPath,
  entityName,
  nameKey,
  onSuccess
}: UseBulkDeleteOptions<T>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(itemId)
      } else {
        newSet.delete(itemId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(data.map(item => item[idKey] as string)))
    } else {
      setSelectedItems(new Set())
    }
  }, [data, idKey])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const handleBulkDelete = useCallback((onOptimisticUpdate: (selectedItems: T[]) => void) => {
    const selectedIds = Array.from(selectedItems)
    const selectedItemsData = data.filter(item => selectedItems.has(item[idKey] as string))

    // Optimistically update UI - pass empty array to indicate delete action
    onOptimisticUpdate([])
    clearSelection()

    let isUndone = false

    // Delete from backend after a delay (if not undone)
    const timeoutId = setTimeout(async () => {
      if (isUndone) return // Skip if undone

      try {
        await axios.post(`${apiPath}/bulk-delete`, {
          ids: selectedIds
        })
        onSuccess?.()
      } catch (error) {
        console.error(`Error bulk deleting ${entityName}s:`, error)
        toast.error(`Failed to delete ${entityName}s`)
      }
    }, 3000) // 3 seconds delay

    const undoAction = () => {
      // Cancel the delete and restore the items in UI
      isUndone = true
      clearTimeout(timeoutId)
      onOptimisticUpdate(selectedItemsData)
      toast.success("Deletion cancelled")
    }

    toast(`Deleted ${selectedItemsData.length} ${entityName}${selectedItemsData.length !== 1 ? 's' : ''}`, {
      action: {
        label: "Undo",
        onClick: undoAction,
      },
    })
  }, [selectedItems, data, idKey, apiPath, entityName, onSuccess, clearSelection])

  // Reset selection when data changes (pagination, search, etc.)
  const resetSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  return {
    selectedItems,
    selectedCount: selectedItems.size,
    isAllSelected: data.length > 0 && selectedItems.size === data.length,
    handleSelectItem,
    handleSelectAll,
    handleBulkDelete,
    clearSelection,
    resetSelection
  }
}
