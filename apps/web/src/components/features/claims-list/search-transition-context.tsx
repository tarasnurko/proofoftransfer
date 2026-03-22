'use client'

import { createContext, useContext, useTransition, type TransitionStartFunction } from 'react'

interface SearchTransitionContextValue {
  isPending: boolean
  startTransition: TransitionStartFunction
}

const SearchTransitionContext = createContext<SearchTransitionContextValue>({
  isPending: false,
  startTransition: (fn) => fn(),
})

export function SearchTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition()

  return (
    <SearchTransitionContext.Provider value={{ isPending, startTransition }}>
      {children}
    </SearchTransitionContext.Provider>
  )
}

export function useSearchTransition() {
  return useContext(SearchTransitionContext)
}
