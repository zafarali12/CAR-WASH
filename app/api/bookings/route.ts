// app/api/bookings/route.ts
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabaseClient()
  const body = await req.json()

  const {
    service_id, vehicle_id, address, location,
    scheduled_date, scheduled_time,
    coupon_id, discount_amount, final_price, total_price,
    notes
  } = body

  // Get customer ID
  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', userId).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).single()
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Create booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: customer.id,
      service_id,
      vehicle_id,
      address,
      location: location || { lat: 0, lng: 0 },
      scheduled_date,
      scheduled_time,
      total_price,
      coupon_id,
      discount_amount: discount_amount || 0,
      final_price,
      status: 'pending',
      payment_status: 'pending',
      notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Send notification to admins about new booking
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'sub_admin'])

  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map(a => ({
        user_id: a.id,
        title: 'New Booking Request',
        message: `A new booking has been placed for ${scheduled_date} at ${scheduled_time}`,
        type: 'booking_update',
        booking_id: data.id,
      }))
    )
  }

  return NextResponse.json({ data, success: true })
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabaseClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')

  const { data: user } = await supabase.from('users').select('id, role').eq('clerk_id', userId).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let query = supabase
    .from('bookings')
    .select(`
      id, status, final_price, scheduled_date, scheduled_time, address, created_at,
      customers(name), drivers(name), services(name), vehicles(make, model)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  if (user.role === 'customer') {
    const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).single()
    if (customer) query = query.eq('customer_id', customer.id)
  } else if (user.role === 'driver') {
    const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).single()
    if (driver) query = query.eq('driver_id', driver.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data, success: true })
}
