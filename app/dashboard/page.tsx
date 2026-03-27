import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardRedirect({ searchParams }: { searchParams: { role?: string } }) {
  const { userId, sessionClaims } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect('/sign-in')
  }

  const supabase = createAdminSupabaseClient()
  const cookieStore = cookies()
  const preferredRole = cookieStore.get('preferred_role')?.value
  const detectedRole = searchParams.role || preferredRole || (sessionClaims?.publicMetadata as any)?.role

  // 1. SELF-HEALING SYNC: Ensure the user exists in our DB
  let { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', userId)
    .maybeSingle()

  if (!dbUser) {
    // 1a. Check if this email is whitelisted for Admin
    const { data: isWhitelisted } = await supabase
      .from('admin_whitelist')
      .select('email')
      .eq('email', user!.emailAddresses[0].emailAddress)
      .maybeSingle()

    // 1b. Initializing new user
    const roleToSet = isWhitelisted ? 'admin' : detectedRole === 'driver' ? 'driver' : 'customer'
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        clerk_id: userId,
        email: user!.emailAddresses[0].emailAddress,
        role: roleToSet
      })
      .select('id, role')
      .single()
    
    if (error || !newUser) {
      redirect('/customer/dashboard')
    }
    dbUser = newUser
  }
  
  // 1c. FOR EXISTING USERS: Check if they should be upgraded to Admin
  if (dbUser!.role !== 'admin') {
    const { data: isWhitelisted } = await supabase
      .from('admin_whitelist')
      .select('email')
      .eq('email', user!.emailAddresses[0].emailAddress)
      .maybeSingle()
    
    if (isWhitelisted) {
      const { data: upgraded } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', dbUser!.id)
        .select('id, role')
        .single()
      if (upgraded) dbUser = upgraded
    }
  }

  // 1d. If user wants to become a driver, upgrade their role in DB
  if (dbUser!.role === 'customer' && (preferredRole === 'driver' || detectedRole === 'driver')) {
    const { data: upgraded } = await supabase
       .from('users')
       .update({ role: 'driver' })
       .eq('id', dbUser!.id)
       .select('id, role')
       .single()
    if (upgraded) dbUser = upgraded
  }

  const role = dbUser!.role

  // 2. DRIVER INITIALIZATION + ROUTING
  if (role === 'driver') {
    const { data: driver } = await supabase
      .from('drivers')
      .select('is_approved')
      .eq('user_id', dbUser!.id)
      .maybeSingle()

    if (!driver) {
      await supabase.from('drivers').insert({
        user_id: dbUser!.id,
        name: `${user!.firstName || ''} ${user!.lastName || ''}`.trim() || 'New Driver',
        phone: user!.phoneNumbers[0]?.phoneNumber || '—',
        is_approved: false
      })
      redirect('/driver-pending')
    }

    if (!driver.is_approved) {
      redirect('/driver-pending')
    }
    
    redirect('/driver/dashboard')
  }

  if (role === 'admin' || role === 'sub_admin') {
    redirect('/admin/dashboard')
  }
  
  // Default for customers
  redirect('/customer/dashboard')
}
