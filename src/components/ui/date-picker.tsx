"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ date, onDateChange, placeholder = "Pick a date" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateTimePickerProps {
  dateTime?: Date
  onDateTimeChange?: (dateTime: Date | undefined) => void
  placeholder?: string
}

export function DateTimePicker({ dateTime, onDateTimeChange, placeholder = "Pick date and time" }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(dateTime)

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date && dateTime) {
      // Preserve the time from existing datetime when changing date
      const newDateTime = new Date(date)
      newDateTime.setHours(dateTime.getHours(), dateTime.getMinutes(), dateTime.getSeconds())
      onDateTimeChange?.(newDateTime)
    } else if (date) {
      // Set default time to current time if no existing datetime
      const now = new Date()
      const newDateTime = new Date(date)
      newDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
      onDateTimeChange?.(newDateTime)
    } else {
      onDateTimeChange?.(date)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value
    if (selectedDate) {
      const [hours, minutes] = timeString.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes, 0, 0)
      setSelectedDate(newDateTime)
      onDateTimeChange?.(newDateTime)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateTime && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateTime ? format(dateTime, "PPP p") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="space-y-4 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="flex items-center gap-2">
            <label htmlFor="time" className="text-sm font-medium">
              Time:
            </label>
            <input
              id="time"
              type="time"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={dateTime ? format(dateTime, 'HH:mm') : ''}
              onChange={handleTimeChange}
              disabled={!selectedDate}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
