'use server'

import { createClerkClient } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export async function setUserRole(userId: string, role: 'admin' | 'driver' | 'customer') {
  try {
    // 1. Update Clerk Metadata
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role }
    })

    const supabase = createAdminSupabaseClient()
    
    // First, let's find or create the user in our DB
    let { data: userRecord } = await supabase.from('users').select('id').eq('clerk_id', userId).maybeSingle()
    
    if (!userRecord) {
      const clerkUser = await clerk.users.getUser(userId)
      const { data: newUser } = await supabase.from('users').insert({
        clerk_id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: role
      }).select('id').single()
      userRecord = newUser
    } else {
      await supabase.from('users').update({ role }).eq('id', userRecord.id)
    }
    
    if (userRecord) {
      
      // If becoming a driver, ensure a driver record exists
      if (role === 'driver') {
        const { data: existingDriver } = await supabase.from('drivers').select('id').eq('user_id', userRecord.id).single()
        if (!existingDriver) {
          const clerkUser = await clerk.users.getUser(userId)
          await supabase.from('drivers').insert({
            user_id: userRecord.id,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Driver',
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || '+923000000000', // Mandatory field
            is_approved: false, // New drivers start as pending
            is_available: true,
          })
        }
      }
    }

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Role update error:', err)
    return { success: false, error: err.message }
  }
}
