// app/(customer)/customer/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MapPin, Clock, ChevronRight, Star, Zap } from 'lucide-react'

const SERVICE_ICONS: Record<string, string> = {
  basic_wash: '🚿', premium_wash: '✨', interior_clean: '🪟',
  exterior_detail: '🔆', full_detail: '💎', custom: '⚙️',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Finding driver...', assigned: 'Driver assigned',
  driver_on_way: 'Driver on the way', arrived: 'Driver arrived',
  in_progress: 'Washing in progress', completed: 'Completed', cancelled: 'Cancelled',
}

export default function CustomerDashboard() {
  const { user } = useUser()
  const [activeBooking, setActiveBooking] = useState<any>(null)
  const [services, setServices] = useState<any[]>([
    { id: 'basic', name: 'Basic Wash', price: 40, category: 'basic_wash' },
    { id: 'premium', name: 'Premium Wash', price: 80, category: 'premium_wash' },
    { id: 'interior', name: 'Interior Clean', price: 70, category: 'interior_clean' },
  ])
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bannerIdx, setBannerIdx] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    subscribeToActiveBooking()
  }, [])

  async function fetchData() {
    const [servicesRes, bannersRes] = await Promise.all([
      supabase.from('services').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_banners').select('*').eq('is_active', true).order('sort_order'),
    ])
    setServices(servicesRes.data || [])
    setBanners(bannersRes.data || [])

    // Fetch active booking
    const customerRes = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', (await supabase.from('users').select('id').eq('clerk_id', user?.id || '').single()).data?.id)
      .single()

    if (customerRes.data) {
      const bookingRes = await supabase
        .from('bookings')
        .select(`
          id, status, scheduled_date, scheduled_time, address, final_price,
          services(name, category),
          drivers(name, phone, rating),
          vehicles(make, model)
        `)
        .eq('customer_id', customerRes.data.id)
        .in('status', ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (bookingRes.data) setActiveBooking(bookingRes.data)
    }
    setLoading(false)
  }

  function subscribeToActiveBooking() {
    if (!activeBooking) return
    const channel = supabase
      .channel('booking-updates')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `id=eq.${activeBooking?.id}`,
      }, (payload) => {
        setActiveBooking((prev: any) => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const statusSteps = ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress', 'completed']
  const currentStep = activeBooking ? statusSteps.indexOf(activeBooking.status) : -1

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Hello, {user?.firstName || 'there'}! 👋
        </h1>
        <p className="text-sm text-gray-400">Book your car wash today</p>
      </div>

      {/* Banner */}
      {banners.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-600 to-primary-800 p-5 text-white">
          <h2 className="text-lg font-bold mb-1">{banners[bannerIdx].title}</h2>
          {banners[bannerIdx].subtitle && (
            <p className="text-sm text-white/80">{banners[bannerIdx].subtitle}</p>
          )}
          {banners.length > 1 && (
            <div className="flex gap-1 mt-3">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl opacity-20">🚗</div>
        </div>
      )}

      {/* Active Booking */}
      {activeBooking && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Active Booking</h2>
            <span className="badge-active text-xs">
              <Zap size={10} className="inline mr-1" />
              Live
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between mb-8 px-1 relative">
            <div className="absolute left-4 right-4 top-4 h-0.5 bg-gray-100 -z-0" />
            {statusSteps.slice(0, 5).map((step, i) => (
              <div key={step} className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  i < currentStep ? 'bg-primary-600 text-white shadow-primary-100'
                  : i === currentStep ? 'bg-white border-2 border-primary-600 text-primary-600 shadow-md scale-110'
                  : 'bg-white border border-gray-100 text-gray-300'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 text-center mb-4 font-medium">
            {STATUS_LABELS[activeBooking.status]}
          </p>

          {/* Booking Info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-lg">{SERVICE_ICONS[activeBooking.services?.category] || '🚗'}</span>
              <span>{activeBooking.services?.name}</span>
              <span className="ml-auto font-semibold text-primary-600">SAR {activeBooking.final_price}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin size={14} />
              <span className="truncate">{activeBooking.address}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={14} />
              <span>{activeBooking.scheduled_date} at {activeBooking.scheduled_time?.slice(0, 5)}</span>
            </div>
          </div>

          {/* Driver Info */}
          {activeBooking.drivers && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary-200 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {activeBooking.drivers.name?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{activeBooking.drivers.name}</p>
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs text-gray-500">{activeBooking.drivers.rating?.toFixed(1)}</span>
                </div>
              </div>
              <a href={`tel:${activeBooking.drivers.phone}`} className="ml-auto btn-secondary text-xs px-3 py-1.5">
                Call
              </a>
            </div>
          )}

          <Link href={`/customer/bookings/${activeBooking.id}`} className="btn-primary w-full mt-3 text-center">
            View Details
          </Link>
        </div>
      )}

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Our Services</h2>
          <Link href="/customer/services" className="text-xs text-primary-600 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.slice(0, 4).map(s => (
            <Link key={s.id} href={`/customer/services?book=${s.id}`} className="card p-4 hover:border-primary-200 transition-colors active:scale-95">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl mb-3">
                {SERVICE_ICONS[s.category] || '🚗'}
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
              <p className="text-primary-600 font-bold text-base mt-0.5">SAR {s.price}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock size={11} /> {s.duration} min
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Book */}
      {!activeBooking && (
        <Link href="/customer/services" className="btn-primary w-full text-center text-base py-3">
          Book a Car Wash
        </Link>
      )}
    </div>
  )
}
