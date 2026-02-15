'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const MAX_VISIBLE = 5

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    if (!totalPages || totalPages <= MAX_VISIBLE) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const items: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1]
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    if (start > 2) items.push('ellipsis-start')
    for (let i = start; i <= end; i++) items.push(i)
    if (end < totalPages - 1) items.push('ellipsis-end')
    items.push(totalPages)

    return items
  }, [totalPages, currentPage])

  if (!totalPages || totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="border-2 font-bold"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex gap-1">
        {pages.map((page, i) =>
          typeof page === 'string' ? (
            <span key={page} className="flex items-center px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="border-2 font-bold"
            >
              {page}
            </Button>
          )
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="border-2 font-bold"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
