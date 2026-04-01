// app/(customer)/customer/bookings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Clock, MapPin, Star, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { submitReviewAction } from './actions'

type Filter = 'all' | 'active' | 'completed' | 'cancelled'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Finding Driver', assigned: 'Driver Assigned',
  driver_on_way: 'On The Way', arrived: 'Arrived',
  in_progress: 'Washing', completed: 'Completed', cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending', assigned: 'badge-assigned', driver_on_way: 'badge-assigned',
  arrived: 'badge-assigned', in_progress: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled',
}

export default function CustomerBookings() {
  const { user } = useUser()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [reviewModal, setReviewModal] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [cancelModal, setCancelModal] = useState<any>(null)
  const [cancelReasons, setCancelReasons] = useState<any[]>([])
  const [selectedReason, setSelectedReason] = useState('')
  const supabase = createClient()

  useEffect(() => { fetchBookings() }, [user, filter])

  async function fetchBookings() {
    if (!user?.id) return
    setLoading(true)
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return
    const custRes = await supabase.from('customers').select('id').eq('user_id', userRes.data.id).single()
    if (!custRes.data) return

    let query = supabase
      .from('bookings')
      .select(`
        id, status, final_price, total_price, discount_amount,
        scheduled_date, scheduled_time, address, created_at, payment_status,
        services(name, category, duration),
        driver_id,
        drivers(id, name, rating, phone),
        vehicles(make, model, color, plate_number),
        reviews(id, rating, comment)
      `)
      .eq('customer_id', custRes.data.id)
      .order('created_at', { ascending: false })

    if (filter === 'active') query = query.in('status', ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress'])
    else if (filter === 'completed') query = query.eq('status', 'completed')
    else if (filter === 'cancelled') query = query.eq('status', 'cancelled')

    const { data } = await query
    setBookings(data || [])
    setLoading(false)
  }

  async function fetchCancelReasons() {
    const { data } = await supabase.from('cancellation_reasons').select('*').eq('type', 'customer').eq('is_active', true)
    setCancelReasons(data || [])
  }

  async function cancelBooking() {
    if (!selectedReason) { toast.error('Please select a reason'); return }
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancellation_reason: selectedReason, cancelled_by: 'customer' })
      .eq('id', cancelModal.id)
    if (!error) {
      toast.success('Booking cancelled')
      setCancelModal(null)
      fetchBookings()
    }
  }

  async function submitReview() {
    if (!reviewModal) return
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user?.id || '').single()
    const custRes = await supabase.from('customers').select('id').eq('user_id', userRes.data?.id || '').single()
    
    const result = await submitReviewAction({
      booking_id: reviewModal.id,
      customer_id: custRes.data?.id,
      driver_id: reviewModal.drivers?.id || reviewModal.driver_id,
      rating,
      comment,
    })

    if (result.success) {
      toast.success('Review submitted! Thank you.')
      setReviewModal(null)
      setRating(5)
      setComment('')
      fetchBookings()
    } else {
      toast.error(result.error || 'Failed to submit review')
    }
  }

  const SERVICE_ICONS: Record<string, string> = {
    basic_wash: '🚿', premium_wash: '✨', interior_clean: '🪟',
    exterior_detail: '🔆', full_detail: '💎', custom: '⚙️',
  }

  const isActive = (status: string) => ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress'].includes(status)
  const canCancel = (status: string) => ['pending', 'assigned'].includes(status)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">My Bookings</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'active', 'completed', 'cancelled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all flex-shrink-0 ${
              filter === f ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🚗</div>
          <p className="text-gray-400 mb-4">No bookings yet</p>
          <Link href="/customer/services" className="btn-primary">Book Now</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="card p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
                    {SERVICE_ICONS[b.services?.category] || '🚗'}
                  </div>
                  <div>
                    <p className="font-semibold">{b.services?.name}</p>
                    <p className="text-xs text-gray-400">#{b.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <span className={STATUS_COLORS[b.status]}>{STATUS_LABELS[b.status]}</span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={13} />
                  <span>{b.scheduled_date} at {b.scheduled_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin size={13} />
                  <span className="truncate">{b.address}</span>
                </div>
                {b.drivers && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>🧑‍🔧</span>
                    <span>{b.drivers.name}</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs">{b.drivers.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price + Vehicle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
                <span className="text-gray-400">{b.vehicles?.color} {b.vehicles?.make} {b.vehicles?.model}</span>
                <div className="text-right">
                  {b.discount_amount > 0 && (
                    <p className="text-xs text-gray-400 line-through">${b.total_price}</p>
                  )}
                  <p className="font-semibold text-primary-600">${b.final_price}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {isActive(b.status) && (
                  <Link href={`/customer/bookings/${b.id}`} className="btn-primary flex-1 text-center text-sm">
                    Track Order <ChevronRight size={14} />
                  </Link>
                )}
                {canCancel(b.status) && (
                  <button
                    className="btn-danger text-sm px-3"
                    onClick={() => { setCancelModal(b); fetchCancelReasons() }}
                  >
                    <X size={14} /> Cancel
                  </button>
                )}
                {b.status === 'completed' && !b.reviews?.length && (
                  <button
                    className="btn-secondary flex-1 text-sm"
                    onClick={() => setReviewModal(b)}
                  >
                    <Star size={14} /> Rate Service
                  </button>
                )}
                {b.status === 'completed' && b.reviews?.length > 0 && (
                  <div className="flex items-center gap-1 flex-1 justify-center text-sm text-amber-500">
                    <Star size={14} className="fill-amber-400" />
                    <span>You rated {b.reviews[0].rating}/5</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4">
            <h2 className="font-semibold text-lg">Rate Your Experience</h2>
            <p className="text-sm text-gray-400">{reviewModal.services?.name} · {reviewModal.drivers?.name}</p>
            {/* Stars */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={36} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-gray-600">
              {rating === 5 ? 'Excellent! 🎉' : rating === 4 ? 'Very Good 👍' : rating === 3 ? 'Average 😐' : rating === 2 ? 'Poor 😕' : 'Very Poor 😞'}
            </p>
            <textarea
              className="input w-full"
              rows={3}
              placeholder="Share your experience (optional)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setReviewModal(null)}>Skip</button>
              <button className="btn-primary flex-1" onClick={submitReview}>Submit Review</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={e => e.target === e.currentTarget && setCancelModal(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4">
            <h2 className="font-semibold text-lg">Cancel Booking</h2>
            <p className="text-sm text-gray-400">Why are you cancelling?</p>
            <div className="space-y-2">
              {cancelReasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReason(r.reason)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selectedReason === r.reason ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {r.reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setCancelModal(null)}>Keep Booking</button>
              <button className="btn-danger flex-1" onClick={cancelBooking} disabled={!selectedReason}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
