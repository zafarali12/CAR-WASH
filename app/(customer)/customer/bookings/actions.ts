'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function submitReviewAction(payload: any) {
  try {
    const supabase = createAdminSupabaseClient()
    
    // 1. Insert review
    const { error: insertError } = await supabase.from('reviews').insert(payload)
    if (insertError) return { error: insertError.message }
    
    // 2. Update driver's average rating
    if (payload.driver_id) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('driver_id', payload.driver_id)
        
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((acc: any, curr: any) => acc + curr.rating, 0) / reviews.length
        await supabase
          .from('drivers')
          .update({ rating: parseFloat(avg.toFixed(1)) })
          .eq('id', payload.driver_id)
      }
    }
    
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
