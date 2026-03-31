'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function validateCouponAction(code: string) {
  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .single()
      
    if (error || !data) {
      return { error: 'Invalid or expired coupon' }
    }
    return { data }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function incrementCouponUsageAction(couponId: string) {
  try {
    const supabase = createAdminSupabaseClient()
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', couponId)
      .single()

    if (fetchError || !coupon) return { error: 'Coupon not found' }

    const { error } = await supabase
      .from('coupons')
      .update({ used_count: (coupon.used_count || 0) + 1 })
      .eq('id', couponId)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
