// middleware.ts
import { clerkMiddleware, createRouteMatcher, createClerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isDriverRoute = createRouteMatcher(['/driver(.*)'])
const isCustomerRoute = createRouteMatcher(['/customer(.*)'])

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, sessionClaims } = auth().protect()
  let email = (sessionClaims?.email as string) || (sessionClaims as any)?.primary_email
  let role = (sessionClaims?.publicMetadata as any)?.role as string || 'customer'

  // Admin route protection: Extremely Strict
  if (isAdminRoute(req)) {
    // If email is not in session claims, fetch it from Clerk API (backup)
    if (!email) {
      const user = await clerk.users.getUser(userId)
      email = user.emailAddresses[0]?.emailAddress
    }

    if (!email) {
      console.warn(`SECURITY ALERT: No email found for user ${userId}`)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // 1. Check if their email is in the admin_whitelist in Supabase
    const { data: whitelist } = await supabaseAdmin
      .from('admin_whitelist')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (!whitelist) {
      console.warn(`SECURITY ALERT: Unauthorized Admin Access Attempt by ${email}`)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // 2. Verified as admin, allow access
    return
  }

  // Driver route protection
  if (isDriverRoute(req) && role !== 'driver' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Customer route protection
  if (isCustomerRoute(req) && role !== 'customer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}


