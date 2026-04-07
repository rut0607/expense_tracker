import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add user info to headers for API routes
    if (req.nextauth.token) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', req.nextauth.token.id)
      requestHeaders.set('x-user-email', req.nextauth.token.email)
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login',
    }
  }
)

export const config = {
  matcher: [
    // Protected routes
    '/',
    '/dashboard/:path*',
    '/analytics/:path*',
    '/history/:path*',
    '/budgets/:path*',
    '/settings/:path*',
    // Protected API routes
    '/api/expenses/:path*',
    '/api/budgets/:path*',
    '/api/analytics/:path*',
    '/api/splits/:path*',
    '/api/user/:path*',
    '/api/email/:path*',
  ]
}