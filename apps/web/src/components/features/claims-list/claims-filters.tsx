'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CHAINS } from '@/lib/types'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useSearchTransition } from './search-transition-context'

export function ClaimsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { startTransition } = useSearchTransition()

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebounce(searchInput, 300)

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!('page' in updates)) params.delete('page')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }, [router, pathname, searchParams, startTransition])

  useEffect(() => {
    const current = searchParams.get('search') ?? ''
    if (debouncedSearch !== current) {
      updateParams({ search: debouncedSearch || undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const chainFilter = searchParams.get('chain') ?? 'all'
  const sortValue = `${searchParams.get('sort') ?? 'createdAt'}-${searchParams.get('order') ?? 'desc'}`

  const handleChainChange = (value: string) => {
    updateParams({ chain: value === 'all' ? undefined : value })
  }

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split('-')
    updateParams({ sort, order })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative lg:col-span-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by message, address, hash..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border-2 pl-9 font-bold"
        />
      </div>
      <Select value={chainFilter} onValueChange={handleChainChange}>
        <SelectTrigger className="border-2 font-bold">
          <SelectValue placeholder="All Chains" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Chains</SelectItem>
          {SUPPORTED_CHAINS.map((chain) => (
            <SelectItem key={chain.id} value={chain.id.toString()}>
              {chain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortValue} onValueChange={handleSortChange}>
        <SelectTrigger className="border-2 font-bold">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt-desc">Newest First</SelectItem>
          <SelectItem value="createdAt-asc">Oldest First</SelectItem>
          <SelectItem value="proofCount-desc">Most Proofs</SelectItem>
          <SelectItem value="proofCount-asc">Least Proofs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
