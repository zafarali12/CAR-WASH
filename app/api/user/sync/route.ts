// app/api/user/sync/route.ts
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { clerkId, email, name, profilePhoto } = await req.json()

    if (!clerkId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // 1. Upsert the User record
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        clerk_id: clerkId,
        email: email,
        role: 'customer' // Default role
      }, { onConflict: 'clerk_id' })
      .select()
      .single()

    if (userError || !user) {
      console.error('Sync: Error upserting user:', userError)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    // 2. Upsert the Customer profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        user_id: user.id,
        name: name || email.split('@')[0],
        profile_photo: profilePhoto || null
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (customerError) {
      console.error('Sync: Error upserting customer:', customerError)
      return NextResponse.json({ error: 'Failed to sync customer profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      userId: user.id, 
      customerId: customer.id 
    })
  } catch (err: any) {
    console.error('Sync API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
