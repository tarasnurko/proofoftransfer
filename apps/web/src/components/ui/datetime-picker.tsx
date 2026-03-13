'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { format, isSameDay } from 'date-fns'
import { Calendar as CalendarIcon, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/use-debounce'

const ITEM_H = 40
const VISIBLE_H = 200

interface ScrollColProps {
  items: number[]
  selected: number
  onSelect: (v: number) => void
}

function ScrollCol({ items, selected, onSelect }: ScrollColProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = items.indexOf(selected)
    if (idx >= 0) el.scrollTop = idx * ITEM_H
  }, [selected, items])

  return (
    <div
      ref={ref}
      style={{ height: VISIBLE_H, overflowY: 'auto', scrollbarWidth: 'none', width: '100%' }}
    >
      {items.map((v) => (
        <div
          key={v}
          onClick={() => onSelect(v)}
          style={{ height: ITEM_H, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 8px', justifyContent: 'space-between' }}
          className={cn('select-none text-sm', v === selected ? 'font-bold' : 'text-muted-foreground hover:text-foreground')}
        >
          {v === selected ? <Check className="h-3 w-3 shrink-0" /> : <span style={{ width: 12, display: 'inline-block' }} />}
          <span>{String(v).padStart(2, '0')}</span>
        </div>
      ))}
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  maxDate?: Date
  chainId?: number
  clearable?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date & time',
  disabled,
  maxDate,
  chainId,
  clearable = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [blockNumber, setBlockNumber] = useState<number | null>(null)
  const [blockLoading, setBlockLoading] = useState(false)

  const effectiveMax = maxDate ?? new Date()
  const currentHour = value?.getHours() ?? 0
  const currentMinute = value?.getMinutes() ?? 0

  const handleDateSelect = useCallback((d: Date | undefined) => {
    if (!d) return
    const next = new Date(d)
    next.setHours(currentHour, currentMinute, 0, 0)
    if (next > effectiveMax) {
      next.setTime(effectiveMax.getTime())
      next.setSeconds(0, 0)
    }
    onChange(next)
  }, [currentHour, currentMinute, effectiveMax, onChange])

  const handleHourSelect = useCallback((h: number) => {
    const base = value ?? new Date(effectiveMax)
    const next = new Date(base)
    next.setHours(h, currentMinute, 0, 0)
    if (next > effectiveMax) return
    onChange(next)
  }, [value, currentMinute, effectiveMax, onChange])

  const handleMinuteSelect = useCallback((m: number) => {
    const base = value ?? new Date(effectiveMax)
    const next = new Date(base)
    next.setHours(currentHour, m, 0, 0)
    if (next > effectiveMax) return
    onChange(next)
  }, [value, currentHour, effectiveMax, onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(undefined)
    setBlockNumber(null)
  }, [onChange])

  const debouncedTimestamp = useDebounce(
    value ? Math.floor(value.getTime() / 1000) : null,
    500,
  )

  useEffect(() => {
    if (!debouncedTimestamp || !chainId) { setBlockNumber(null); return }
    setBlockLoading(true)
    fetch(`/api/blocks/block-number?timestamp=${debouncedTimestamp}&chainId=${chainId}`)
      .then((r) => r.json())
      .then((data: { blockNumber?: number }) => setBlockNumber(data.blockNumber ?? null))
      .catch(() => setBlockNumber(null))
      .finally(() => setBlockLoading(false))
  }, [debouncedTimestamp, chainId])

  const isMaxDay = value ? isSameDay(value, effectiveMax) : false
  const maxHour = isMaxDay ? effectiveMax.getHours() : 23
  const maxMinute = isMaxDay && currentHour === maxHour ? effectiveMax.getMinutes() : 59
  const availableHours = HOURS.filter((h) => !isMaxDay || h <= maxHour)
  const availableMinutes = MINUTES.filter((m) => !isMaxDay || currentHour < maxHour || m <= maxMinute)

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-10 w-full justify-start border border-input bg-background text-left font-normal !shadow-none !translate-x-0 !translate-y-0 hover:bg-background active:!translate-x-0 active:!translate-y-0',
              !value && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">
              {value ? format(value, 'PPP HH:mm') : placeholder}
            </span>
            {value && !disabled && clearable ? (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent) }}
                className="ml-2 shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto border-2 border-foreground p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {/* Side-by-side layout: calendar left, time right */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={(d) => d > effectiveMax}
              initialFocus
            />

            {/* Time picker panel */}
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid', width: 120 }} className="border-foreground">
              {/* Column headers */}
              <div style={{ display: 'flex', flexShrink: 0 }} className="border-b border-border">
                <div style={{ flex: 1 }} className="border-r border-border py-1 text-center text-xs font-bold text-muted-foreground">HH</div>
                <div style={{ flex: 1 }} className="py-1 text-center text-xs font-bold text-muted-foreground">MM</div>
              </div>

              {/* Scroll columns */}
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ width: '50%', borderRight: '1px solid' }} className="border-border">
                  <ScrollCol items={availableHours} selected={currentHour} onSelect={handleHourSelect} />
                </div>
                <div style={{ width: '50%' }}>
                  <ScrollCol items={availableMinutes} selected={currentMinute} onSelect={handleMinuteSelect} />
                </div>
              </div>

              {/* Done button */}
              <div style={{ flexShrink: 0 }} className="border-t border-border p-2">
                <Button
                  type="button"
                  className="w-full border-2 font-bold"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {chainId && value && (
        <div className="text-xs text-muted-foreground">
          {blockLoading ? (
            <Skeleton className="h-3 w-32" />
          ) : blockNumber ? (
            <span>Block: {blockNumber}</span>
          ) : null}
        </div>
      )}
    </div>
  )
}
