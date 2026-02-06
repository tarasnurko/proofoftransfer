import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface BackLinkProps {
  href: string
  label: string
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link href={href} className="inline-flex items-center text-sm hover:opacity-80">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Link>
  )
}
