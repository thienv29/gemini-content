"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmText,
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  onConfirm
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error("Confirmation action failed:", error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText || (variant === "destructive" ? "Delete" : "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for managing confirmation state
import { useState } from "react"

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'> | null>(null)

  const confirm = (config: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>) => {
    setConfig(config)
    setIsOpen(true)
  }

  const reset = () => {
    setIsOpen(false)
    setConfig(null)
  }

  const ConfirmationDialogComponent = () => (
    config ? (
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        {...config}
        onConfirm={async () => {
          await config.onConfirm()
          reset()
        }}
      />
    ) : null
  )

  return {
    confirm,
    ConfirmationDialog: ConfirmationDialogComponent,
    isOpen,
    reset
  }
}
