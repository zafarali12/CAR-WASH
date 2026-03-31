'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function fetchCouponsAction() {
  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function upsertCoupon(payload: any, editId: string | null) {
  try {
    const supabase = createAdminSupabaseClient()
    if (editId) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editId)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('coupons').insert(payload)
      if (error) return { error: error.message }
    }
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteCouponAction(id: string) {
  try {
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') { // Foreign key constraint violation code
        return { error: 'Coupon has already been used in bookings. Please disable it instead of deleting it.' }
      }
      return { error: error.message }
    }
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function toggleCouponActiveAction(id: string, current: boolean) {
  try {
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    if (error) return { error: error.message }
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
