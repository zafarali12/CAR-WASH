// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    const email = email_addresses[0].email_address
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0]

    const supabase = createAdminSupabaseClient()

    // 1. Create or update the root user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        clerk_id: id,
        email: email,
        role: 'customer',
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user in Supabase:', userError)
      return new Response('Error creating user', { status: 500 })
    }

    // 2. Create the customer profile
    const { error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: name,
        profile_photo: image_url,
      })

    if (customerError) {
      console.error('Error creating customer profile:', customerError)
      return new Response('Error creating customer profile', { status: 500 })
    }

    console.log('Webhook user.created synced successfully:', id)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    const email = email_addresses[0].email_address
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0]

    const supabase = createAdminSupabaseClient()

    // Update user root
    const { data: user, error: userError } = await supabase
      .from('users')
      .update({ email: email })
      .eq('clerk_id', id)
      .select()
      .single()

    if (user) {
      // Update customer profile
      await supabase
        .from('customers')
        .update({
          name: name,
          profile_photo: image_url,
        })
        .eq('user_id', user.id)
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    const supabase = createAdminSupabaseClient()
    await supabase.from('users').delete().eq('clerk_id', id)
  }

  return new Response('', { status: 200 })
}
