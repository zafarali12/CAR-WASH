// app/(customer)/customer/bookings/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Phone, ArrowLeft, Star, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  { status: 'pending', label: 'Booking Placed', icon: '📋' },
  { status: 'assigned', label: 'Driver Assigned', icon: '🧑‍🔧' },
  { status: 'driver_on_way', label: 'Driver On The Way', icon: '🚗' },
  { status: 'arrived', label: 'Driver Arrived', icon: '📍' },
  { status: 'in_progress', label: 'Washing In Progress', icon: '🫧' },
  { status: 'completed', label: 'Completed', icon: '✅' },
]

export default function BookingDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBooking()
    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}`,
      }, payload => {
        setBooking((prev: any) => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function fetchBooking() {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *, services(*), drivers(id, name, phone, rating, profile_photo),
        vehicles(*), reviews(*)
      `)
      .eq('id', id)
      .single()
    setBooking(data)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  if (!booking) return <div className="text-center py-16 text-gray-400">Booking not found</div>

  const currentStepIdx = STEPS.findIndex(s => s.status === booking.status)
  const isCancelled = booking.status === 'cancelled'
  const isCompleted = booking.status === 'completed'

  return (
    <div>
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-4 hover:text-gray-700">
        <ArrowLeft size={18} /> Back to Bookings
      </button>

      {/* Booking Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-xs text-gray-400">#{booking.id.slice(0, 8).toUpperCase()}</p>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isCancelled ? 'bg-red-50 text-red-600' :
            isCompleted ? 'bg-blue-50 text-blue-600' :
            'bg-green-50 text-green-600'
          }`}>
            {booking.status.replace(/_/g, ' ')}
          </span>
        </div>
        <h1 className="text-lg font-semibold">{booking.services?.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Clock size={13} />{booking.scheduled_date} · {booking.scheduled_time?.slice(0, 5)}</span>
          <span className="font-semibold text-primary-600">SAR {booking.final_price}</span>
        </div>
      </div>

      {/* Progress Tracker */}
      {!isCancelled && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold text-sm mb-4">Order Progress</h2>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isDone = i < currentStepIdx
              const isCurrent = i === currentStepIdx
              const isLast = i === STEPS.length - 1
              return (
                <div key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all ${
                      isDone ? 'bg-primary-600 text-white' :
                      isCurrent ? 'bg-primary-100 border-2 border-primary-500 text-primary-600' :
                      'bg-gray-100 text-gray-300'
                    }`}>
                      {isDone ? <CheckCircle size={14} /> : step.icon}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-8 my-1 ${i < currentStepIdx ? 'bg-primary-400' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className={`pt-1.5 pb-4 ${!isLast ? '' : ''}`}>
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary-700' : isDone ? 'text-gray-700' : 'text-gray-300'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-primary-500 mt-0.5 animate-pulse">● In progress</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Driver Info */}
      {booking.drivers && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold text-sm mb-3">Your Driver</h2>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {booking.drivers.name?.[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{booking.drivers.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                <span className="text-sm text-gray-500">{booking.drivers.rating?.toFixed(1)} rating</span>
              </div>
            </div>
            <a
              href={`tel:${booking.drivers.phone}`}
              className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100"
            >
              <Phone size={18} />
            </a>
          </div>
        </div>
      )}

      {/* Location */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-2">Location</h2>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
          <span>{booking.address}</span>
        </div>
        <div className="mt-3 h-32 bg-green-50 rounded-xl flex items-center justify-center text-green-600 text-sm border border-green-100">
          📍 Live Map · Google Maps Integration Required
        </div>
      </div>

      {/* Vehicle */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-2">Vehicle</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚗</span>
          <div>
            <p className="font-medium">{booking.vehicles?.color} {booking.vehicles?.make} {booking.vehicles?.model}</p>
            <p className="text-sm text-gray-400 font-mono">{booking.vehicles?.plate_number}</p>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">Payment</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Service</span><span>SAR {booking.total_price}</span></div>
          {booking.discount_amount > 0 && (
            <div className="flex justify-between text-green-600"><span>Discount</span><span>-SAR {booking.discount_amount}</span></div>
          )}
          <div className="flex justify-between font-semibold border-t border-gray-50 pt-2">
            <span>Total</span><span className="text-primary-600">SAR {booking.final_price}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Payment Status</span>
            <span className={booking.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}>{booking.payment_status}</span>
          </div>
        </div>
      </div>

      {/* Review (if completed and no review) */}
      {isCompleted && !booking.reviews?.length && (
        <div className="card p-4 border-amber-100 bg-amber-50 mb-4">
          <p className="font-medium text-amber-800 mb-2">How was your experience?</p>
          <p className="text-sm text-amber-600 mb-3">Share your feedback to help us improve.</p>
          <Link href="/customer/bookings?review=true" className="btn-primary text-sm">Leave a Review</Link>
        </div>
      )}

      {/* Cancellation Info */}
      {isCancelled && (
        <div className="card p-4 border-red-100 bg-red-50 mb-4">
          <p className="font-medium text-red-700">Booking Cancelled</p>
          {booking.cancellation_reason && (
            <p className="text-sm text-red-500 mt-1">Reason: {booking.cancellation_reason}</p>
          )}
        </div>
      )}
    </div>
  )
}
