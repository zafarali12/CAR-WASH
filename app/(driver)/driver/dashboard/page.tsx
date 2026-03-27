// app/(driver)/driver/dashboard/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { 
  Bell, MapPin, Navigation, Phone, User, CheckCircle2, CheckCircle, XCircle, Star,
  Car, Clock, ClipboardList, TrendingUp, Power
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  assigned: { next: 'driver_on_way', label: 'Start Driving', btnClass: 'btn-primary' },
  driver_on_way: { next: 'arrived', label: 'I Have Arrived', btnClass: 'btn-primary' },
  arrived: { next: 'in_progress', label: 'Start Washing', btnClass: 'btn-primary' },
  in_progress: { next: 'completed', label: 'Mark as Completed', btnClass: 'btn-success' },
}

export default function DriverDashboard() {
  const { user } = useUser()
  const [driverData, setDriverData] = useState<any>(null)
  const [pendingRequest, setPendingRequest] = useState<any>(null)
  const [activeJob, setActiveJob] = useState<any>(null)
  const [todayJobs, setTodayJobs] = useState<any[]>([])
  const [stats, setStats] = useState({ today: 0, jobs: 0, rating: 0 })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    // 1. Ensure user record exists
    let { data: userRecord } = await supabase.from('users').select('id').eq('clerk_id', user.id).maybeSingle()
    if (!userRecord) {
      const { data: newUser } = await supabase.from('users').insert({
        clerk_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        role: 'driver'
      }).select('id').single()
      userRecord = newUser
    }

    if (!userRecord) {
      setLoading(false)
      return
    }

    // 2. Ensure driver record exists
    let { data: driverRes, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, is_available, is_approved, rating, completed_jobs')
      .eq('user_id', userRecord.id)
      .maybeSingle()
    
    // Auto-create for dev if missing
    if (!driverRes && !driverError) {
      const { data: newDriver } = await supabase
        .from('drivers')
        .insert({
          user_id: userRecord.id,
          name: user.fullName || 'Driver Professional',
          phone: user.primaryPhoneNumber?.phoneNumber || '+923000000000',
          is_approved: false,
          is_available: true,
          rating: 5.0,
          completed_jobs: 0
        })
        .select()
        .single()
      driverRes = newDriver
    }

    if (!driverRes) {
      setLoading(false)
      return
    }
    setDriverData(driverRes)

    const today = new Date().toISOString().split('T')[0]

    // Today's bookings
    const bookingsRes = await supabase
      .from('bookings')
      .select(`
        id, status, scheduled_date, scheduled_time, address, final_price,
        customers(name, id),
        services(name, category, duration),
        vehicles(make, model, plate_number)
      `)
      .eq('driver_id', driverRes.id)
      .eq('scheduled_date', today)
      .order('scheduled_time')
    setTodayJobs(bookingsRes.data || [])

    // Active job
    const activeRes = await supabase
      .from('bookings')
      .select(`
        id, status, scheduled_date, scheduled_time, address, final_price,
        customers(name, id),
        services(name, category, duration),
        vehicles(make, model, plate_number, color)
      `)
      .eq('driver_id', driverRes.id)
      .in('status', ['assigned', 'driver_on_way', 'arrived', 'in_progress'])
      .limit(1)
      .single()
    if (activeRes.data) setActiveJob(activeRes.data)

    // Pending request (unassigned bookings)
    if (driverRes.is_available) {
      const pendingRes = await supabase
        .from('bookings')
        .select(`
          id, scheduled_date, scheduled_time, address, final_price,
          customers(name),
          services(name, duration),
          vehicles(make, model)
        `)
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at')
        .limit(1)
        .single()
      if (pendingRes.data) setPendingRequest(pendingRes.data)
    }

    // Stats
    const todayEarnings = (bookingsRes.data || [])
      .filter((b: any) => b.status === 'completed')
      .reduce((s: number, b: any) => s + b.final_price, 0)
    setStats({
      today: todayEarnings,
      jobs: (bookingsRes.data || []).filter((b: any) => b.status === 'completed').length,
      rating: driverRes.rating || 0,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
    // Subscribe to new booking requests
    const channel = supabase
      .channel('driver-jobs')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `driver_id=eq.${driverData?.id}`
      }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  async function toggleAvailability() {
    if (!driverData) return
    const { error } = await supabase
      .from('drivers')
      .update({ is_available: !driverData.is_available })
      .eq('id', driverData.id)
    if (!error) {
      setDriverData((d: any) => ({ ...d, is_available: !d.is_available }))
      toast.success(driverData.is_available ? 'You are now offline' : 'You are now online')
    }
  }

  async function acceptBooking(bookingId: string) {
    setUpdating(true)
    const { error } = await supabase
      .from('bookings')
      .update({ driver_id: driverData.id, status: 'assigned' })
      .eq('id', bookingId)
      .is('driver_id', null)
    if (error) {
      toast.error('Could not accept — booking may have been taken')
    } else {
      toast.success('Booking accepted!')
      setPendingRequest(null)
      fetchData()
    }
    setUpdating(false)
  }

  async function rejectBooking() {
    setPendingRequest(null)
    toast('Booking skipped')
  }

  async function updateJobStatus(bookingId: string, currentStatus: string) {
    const action = STATUS_ACTIONS[currentStatus]
    if (!action) return
    setUpdating(true)
    const nextStatus = action.next
    const updates: any = { status: nextStatus }
    if (nextStatus === 'in_progress') updates.started_at = new Date().toISOString()
    if (nextStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.payment_status = 'paid' // Default action on completion
    }
    const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId)
    if (!error) {
      toast.success(nextStatus === 'completed' ? 'Job completed!' : 'Status updated')
      if (nextStatus === 'completed') setActiveJob(null)
      else setActiveJob((j: any) => ({ ...j, status: nextStatus }))
      fetchData()
    }
    setUpdating(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>

  if (!driverData) {
    return (
      <div className="text-center py-20 px-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <User size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Driver Profile Missing</h2>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
          We couldn't find your professional profile in our database. Please contact support or try resetting your role.
        </p>
        <button 
          onClick={() => window.location.href = '/admin/setup'}
          className="btn-primary"
        >
          Return to Role Setup
        </button>
      </div>
    )
  }

  if (!driverData.is_approved) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Clock size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Approval Pending</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
          Your account is currently under review by our admin team. Once approved, you will receive an approval message <span className="font-semibold text-gray-700">via email</span>!
        </p>
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 justify-center text-sm font-medium text-gray-600">
          We will notify you at <span className="text-gray-900 font-bold">{user?.primaryEmailAddress?.emailAddress}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {driverData?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-gray-400">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            driverData?.is_available
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${driverData?.is_available ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {driverData?.is_available ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Earnings", value: `$${stats.today.toFixed(0)}` },
          { label: 'Jobs Today', value: stats.jobs },
          { label: 'Rating', value: stats.rating > 0 ? stats.rating.toFixed(1) : '—' },
        ].map(s => (
          <div key={s.label} className="stat-card p-3 text-center">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* New Booking Request */}
      {pendingRequest && !activeJob && (
        <div className="card p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-amber-900">New Booking Request!</h2>
            <span className="badge-pending text-xs animate-pulse">New</span>
          </div>
          <div className="bg-white rounded-xl p-3 mb-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium">{pendingRequest.services?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span>{pendingRequest.customers?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span>{pendingRequest.vehicles?.make} {pendingRequest.vehicles?.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span>{pendingRequest.scheduled_date} {pendingRequest.scheduled_time?.slice(0, 5)}</span>
            </div>
            <div className="flex items-start gap-1 text-gray-500">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{pendingRequest.address}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Earning</span>
              <span className="text-green-600">${pendingRequest.final_price}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={rejectBooking} className="btn-danger flex-1" disabled={updating}>
              <XCircle size={16} /> Skip
            </button>
            <button onClick={() => acceptBooking(pendingRequest.id)} className="btn-primary flex-1" disabled={updating}>
              <CheckCircle size={16} /> Accept
            </button>
          </div>
        </div>
      )}

      {/* Active Job */}
      {activeJob && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Active Job</h2>
            <span className="badge-active text-xs capitalize">{activeJob.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{activeJob.customers?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span>{activeJob.services?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span>{activeJob.vehicles?.color} {activeJob.vehicles?.make} {activeJob.vehicles?.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plate</span>
              <span className="font-mono">{activeJob.vehicles?.plate_number}</span>
            </div>
            <div className="flex items-start gap-2 text-gray-500">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{activeJob.address}</span>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <a href="tel:" className="btn-secondary flex-1 text-center text-sm">
              <Phone size={14} /> Call Customer
            </a>
            <a href={`https://maps.google.com?q=${encodeURIComponent(activeJob.address)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-center text-sm">
              <MapPin size={14} /> Navigate
            </a>
          </div>
          {STATUS_ACTIONS[activeJob.status] && (
            <button
              className={`${STATUS_ACTIONS[activeJob.status].btnClass} w-full`}
              onClick={() => updateJobStatus(activeJob.id, activeJob.status)}
              disabled={updating}
            >
              {STATUS_ACTIONS[activeJob.status].label}
            </button>
          )}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Today's Schedule</h2>
        {todayJobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No jobs scheduled for today</p>
        ) : (
          <div className="space-y-3">
            {todayJobs.map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-center flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">{job.scheduled_time?.slice(0, 5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{job.services?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{job.customers?.name}</p>
                </div>
                <span className={`text-xs capitalize badge ${
                  job.status === 'completed' ? 'badge-completed' :
                  job.status === 'cancelled' ? 'badge-cancelled' :
                  job.status === 'in_progress' ? 'badge-active' : 'badge-pending'
                }`}>
                  {job.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
