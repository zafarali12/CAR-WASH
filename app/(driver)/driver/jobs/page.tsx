// app/(driver)/driver/jobs/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Star } from 'lucide-react'

type Filter = 'all' | 'completed' | 'cancelled' | 'upcoming'

const STATUS_COLORS: Record<string, string> = {
  assigned: 'badge-assigned', driver_on_way: 'badge-assigned', arrived: 'badge-assigned',
  in_progress: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled',
}

export default function DriverJobs() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15
  const supabase = createClient()

  useEffect(() => { fetchJobs() }, [user, filter, page])

  async function fetchJobs() {
    if (!user?.id) return
    setLoading(true)
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) {
      setLoading(false)
      return
    }

    const { data: driverRes } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userRes.data.id)
      .maybeSingle()
    
    if (!driverRes) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('bookings')
      .select(`
        id, status, final_price, scheduled_date, scheduled_time, address,
        started_at, completed_at, created_at,
        customers(name),
        services(name, duration),
        vehicles(make, model, color, plate_number),
        reviews(rating, comment)
      `)
      .eq('driver_id', driverRes.id)
      .order('scheduled_date', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

    if (filter === 'completed') query = query.eq('status', 'completed')
    else if (filter === 'cancelled') query = query.eq('status', 'cancelled')
    else if (filter === 'upcoming') query = query.in('status', ['assigned', 'driver_on_way', 'arrived', 'in_progress'])

    const { data } = await query
    setJobs(data || [])
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">My Jobs</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'upcoming', 'completed', 'cancelled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border flex-shrink-0 transition-all ${
              filter === f ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-400">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{job.services?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">#{job.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">SAR {job.final_price}</p>
                  <span className={STATUS_COLORS[job.status] || 'badge-pending'}>{job.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={13} />
                  <span>{job.scheduled_date} · {job.scheduled_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} />
                  <span className="truncate">{job.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>{job.customers?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🚗</span>
                  <span>{job.vehicles?.color} {job.vehicles?.make} {job.vehicles?.model} · {job.vehicles?.plate_number}</span>
                </div>
              </div>

              {/* Duration info */}
              {job.started_at && job.completed_at && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 mb-2">
                  Duration: {Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)} mins
                </div>
              )}

              {/* Review received */}
              {job.reviews?.length > 0 && (
                <div className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg p-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < job.reviews[0].rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  {job.reviews[0].comment && (
                    <p className="text-xs text-gray-500 truncate">"{job.reviews[0].comment}"</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          <div className="flex justify-between pt-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-4 py-2 disabled:opacity-40">Previous</button>
            <span className="text-sm text-gray-400 self-center">Page {page}</span>
            <button disabled={jobs.length < PER_PAGE} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-4 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
