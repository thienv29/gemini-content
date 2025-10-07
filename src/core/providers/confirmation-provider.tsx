"use client"

import React, { createContext, useContext, useState } from 'react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

export interface ConfirmationOptions {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => void
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function useConfirmation() {
  const context = useContext(ConfirmationContext)
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider')
  }
  return context
}

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmationOptions | null>(null)

  const confirm = (options: ConfirmationOptions) => {
    setConfig(options)
    setIsOpen(true)
  }

  const handleConfirm = async () => {
    if (config) {
      try {
        await config.onConfirm()
        setIsOpen(false)
        setConfig(null)
      } catch (error) {
        console.error('Confirmation action failed:', error)
      }
    }
  }

  const handleCancel = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setConfig(null)
    }
  }

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <ConfirmationDialog
          open={isOpen}
          onOpenChange={handleCancel}
          {...config}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmationContext.Provider>
  )
}
