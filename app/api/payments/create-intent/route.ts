// app/api/payments/create-intent/route.ts
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  const supabase = createAdminSupabaseClient()

  // Get booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, final_price, payment_status, customers(users(email))')
    .eq('id', bookingId)
    .single()

  if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const email = (booking.customers as any)?.users?.email

  // Create or get Stripe customer
  let customer
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) {
    customer = existing.data[0]
  } else {
    customer = await stripe.customers.create({ email })
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.final_price * 100), // cents
    currency: 'usd',
    customer: customer.id,
    metadata: { booking_id: bookingId },
    automatic_payment_methods: { enabled: true },
  })

  // Save payment record
  await supabase.from('payments').upsert({
    booking_id: bookingId,
    amount: booking.final_price,
    payment_method: 'card',
    status: 'pending',
    stripe_payment_intent: paymentIntent.id,
  }, { onConflict: 'booking_id' })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  })
}
