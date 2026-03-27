// middleware.ts
import { clerkMiddleware, createRouteMatcher, createClerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/driver-pending(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without any check
  if (isPublicRoute(req)) return

  // All other routes require authentication
  const { userId, sessionClaims } = auth().protect()

  // Admin route protection: Email whitelist only
  if (isAdminRoute(req)) {
    let email = (sessionClaims?.email as string) || (sessionClaims as any)?.primary_email

    // Fallback: fetch email directly from Clerk if not in session claims
    if (!email && userId) {
      const user = await clerk.users.getUser(userId)
      email = user.emailAddresses[0]?.emailAddress
    }

    if (!email) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    const { data: whitelist } = await supabaseAdmin
      .from('admin_whitelist')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (!whitelist) {
      console.warn(`SECURITY ALERT: Unauthorized Admin Access Attempt by ${email}`)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Whitelisted admin — allow access
    return
  }

  // All other authenticated routes (customer, driver) — just allow if logged in
  // Role-based routing is handled by /dashboard hub and individual page guards
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
