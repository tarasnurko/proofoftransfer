import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.COMING_SOON !== 'true') return NextResponse.next()

  const { pathname } = request.nextUrl

  if (pathname === '/coming-soon' || pathname.startsWith('/_next') || pathname.startsWith('/favicons') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/coming-soon', request.url))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image).*)'],
}
