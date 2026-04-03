// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })


export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const bookingId = paymentIntent.metadata.booking_id

    // Update payment record
    await supabase
      .from('payments')
      .update({ status: 'paid', transaction_id: paymentIntent.id, stripe_charge_id: paymentIntent.latest_charge as string })
      .eq('stripe_payment_intent', paymentIntent.id)

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({ payment_status: 'paid', payment_method: 'card' })
      .eq('id', bookingId)

    // Send notification to customer
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, customers(user_id)')
      .eq('id', bookingId)
      .single()

    if (booking) {
      const userId = (booking.customers as any)?.user_id
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Payment Successful',
          message: `Your payment of SAR ${(paymentIntent.amount / 100).toFixed(2)} has been confirmed.`,
          type: 'booking_update',
          booking_id: bookingId,
        })
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent', paymentIntent.id)
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    await supabase
      .from('payments')
      .update({ status: 'refunded', refunded_amount: (charge.amount_refunded / 100) })
      .eq('stripe_charge_id', charge.id)
  }

  return NextResponse.json({ received: true })
}
