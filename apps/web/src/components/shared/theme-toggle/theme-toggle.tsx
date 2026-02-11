'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/use-mounted'

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const mounted = useMounted()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return (
      <Button size="sm" variant="outline">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return (
    <Button size="sm" onClick={toggleTheme} variant="outline">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
