'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ date, onSelect, placeholder = 'Pick a date', disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start border border-input bg-background text-left font-normal !shadow-none !translate-x-0 !translate-y-0 hover:bg-background active:!translate-x-0 active:!translate-y-0',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{date ? format(date, 'PPP') : placeholder}</span>
          {date && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect?.(undefined) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onSelect?.(undefined) } }}
              className="ml-2 shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-2 border-foreground p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onSelect?.(d); setOpen(false) }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
