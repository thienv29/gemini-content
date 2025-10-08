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

  const handleBulkDelete = useCallback((onOptimisticUpdate: (selectedItems: T[], action: 'delete' | 'undo') => void, onSuccess?: () => void) => {
    const selectedIds = Array.from(selectedItems)
    const selectedItemsData = data.filter(item => selectedItems.has(item[idKey] as string))

    clearSelection()
    // Optimistically update UI for delete action
    onOptimisticUpdate(selectedItemsData, 'delete')

    let isUndone = false
    const delay = 5000 // 5 seconds

    const undoAction = () => {
      // Cancel the delete and restore the items in UI
      isUndone = true
      clearTimeout(timeoutId)
      clearInterval(countdownInterval)
      toast.dismiss(toastId)
      onOptimisticUpdate(selectedItemsData, 'undo')
      toast.success("Deletion cancelled")
    }

    // Create toast with initial message
    const toastId = toast(`Deleted ${selectedItemsData.length} ${entityName}${selectedItemsData.length !== 1 ? 's' : ''} - Undo in 5s`, {
      action: {
        label: "Undo",
        onClick: undoAction,
      },
    })

    // Update toast countdown every second
    let countdown = 5
    const countdownInterval = setInterval(() => {
      countdown--
      if (countdown > 0 && !isUndone) {
        toast(`Deleted ${selectedItemsData.length} ${entityName}${selectedItemsData.length !== 1 ? 's' : ''} - Undo in ${countdown}s`, {
          id: toastId,
          action: {
            label: "Undo",
            onClick: undoAction,
          },
        })
      } else {
        clearInterval(countdownInterval)
        if (countdown === 0 && !isUndone) {
          toast.dismiss(toastId)
        }
      }
    }, 1000)

    // Delete from backend after a delay (if not undone)
    const timeoutId = setTimeout(async () => {
      clearInterval(countdownInterval)
      toast.dismiss(toastId)

      if (isUndone) return // Skip if undone

      try {
        await axios.post(`${apiPath}/bulk-delete`, {
          ids: selectedIds
        })
        onSuccess?.()
      } catch (error) {
        console.error(`Error bulk deleting ${entityName}s:`, error)
        toast.error(`Failed to delete ${entityName}s`)
        // Revert optimistic update on failure
        onOptimisticUpdate(selectedItemsData, 'undo')
      }
    }, delay)
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
