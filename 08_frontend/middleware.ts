import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'fr']
const defaultLocale = 'en'

// Define which routes should be localized
const publicRoutes = ['/home', '/about', '/contact', '/docs', '/modules', '/platform', '/security']

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for internal routes, API, _next, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/client-portal') ||
    pathname.startsWith('/admin') ||
    pathname === '/' ||
    pathname.includes('.') // skip files like favicon.ico
  ) {
    return NextResponse.next()
  }

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  if (pathnameIsMissingLocale) {
    // If it's one of our public routes, redirect to the localized version
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    if (isPublicRoute) {
      const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale
      
      return NextResponse.redirect(
        new URL(`/${locale}${pathname}`, request.url)
      )
    }
  }

  // Response with language cookie if not present
  const response = NextResponse.next()
  
  // Extract locale from pathname
  const currentLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  
  if (currentLocale && request.cookies.get('NEXT_LOCALE')?.value !== currentLocale) {
    response.cookies.set('NEXT_LOCALE', currentLocale, { path: '/' })
  }
  
  return response
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
