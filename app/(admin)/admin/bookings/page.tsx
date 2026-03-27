// app/(admin)/admin/bookings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, Plus, Eye, UserCheck, Car, Star } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['all', 'pending', 'assigned', 'driver_on_way', 'in_progress', 'completed', 'cancelled']

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PER_PAGE = 20

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [statusFilter, dateFilter, page])

  async function fetchBookings() {
    setLoading(true)
    let query = supabase
      .from('bookings')
      .select(`
        id, status, final_price, scheduled_date, scheduled_time,
        payment_status, payment_method, address, created_at,
        customers(name, id),
        drivers(name, id),
        services(name),
        vehicles(make, model, plate_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (dateFilter) query = query.eq('scheduled_date', dateFilter)

    const { data, count, error } = await query
    if (!error) {
      setBookings(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }

  const filtered = search
    ? bookings.filter(b =>
        b.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        b.address?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
  const [assigningLoading, setAssigningLoading] = useState(false)

  const statusColors: Record<string, string> = {
    pending: 'badge-pending font-medium',
    assigned: 'badge-assigned font-medium border border-blue-200',
    driver_on_way: 'badge-assigned font-medium',
    arrived: 'badge-active font-medium',
    in_progress: 'badge-active font-medium animate-pulse',
    completed: 'badge-completed font-medium',
    cancelled: 'badge-cancelled font-medium',
  }

  async function openAssignModal(booking: any) {
    setAssigningId(booking.id)
    setAssigningLoading(true)
    const { data } = await supabase
      .from('drivers')
      .select('id, name, is_available, rating')
      .eq('is_approved', true)
      .eq('is_blocked', false)
      .eq('is_available', true)
    
    setAvailableDrivers(data || [])
    setAssigningLoading(false)
  }

  async function handleAssign(driverId: string) {
    if (!assigningId) return
    const { error } = await supabase
      .from('bookings')
      .update({ driver_id: driverId, status: 'assigned' })
      .eq('id', assigningId)
    
    if (error) {
      toast.error('Failed to assign driver')
    } else {
      toast.success('Driver assigned successfully')
      setAssigningId(null)
      fetchBookings()
    }
  }

  return (
    <div>
      <div className="page-header py-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-gray-900">Bookings Management</h1>
          <p className="text-gray-500 text-sm">Monitor and manage all customer wash requests</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-6">
          <Plus size={18} /> New Booking
        </button>
      </div>

      {/* Filters Card */}
      <div className="card p-5 mb-6 border-none shadow-sm bg-white rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, ID, or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-11 py-2.5 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="input w-40 py-2.5 rounded-xl border-gray-100 bg-gray-50/50"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1) }}
              className="input w-40 py-2.5 rounded-xl border-gray-100 bg-gray-50/50"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Booking / Service</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Scheduled</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading bookings...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No bookings found for the selected filters</td></tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{b.services?.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">ID: {b.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold">{b.customers?.name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{b.address}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {b.vehicles ? (
                        <div className="flex items-center gap-2">
                          <Car size={14} className="text-gray-300" />
                          <span>{b.vehicles.make} {b.vehicles.model}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {b.drivers?.name ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                          <UserCheck size={14} />
                          {b.drivers.name}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAssignModal(b)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <Plus size={10} /> Assign Driver
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium text-gray-700">{b.scheduled_date}</p>
                      <p className="text-xs text-gray-400">{b.scheduled_time?.slice(0, 5)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={statusColors[b.status] || 'badge'}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Assignment Modal */}
      {assigningId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCheck size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Assign a Driver</h2>
              <p className="text-sm text-gray-500">Select an available professional for this job</p>
            </div>

            {assigningLoading ? (
              <div className="py-10 text-center"><p className="text-gray-400">Finding available drivers...</p></div>
            ) : availableDrivers.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-900 font-bold">No available drivers</p>
                <p className="text-xs text-gray-400 mt-2">All approved and online drivers are currently busy.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {availableDrivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleAssign(d.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-600 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-600">{d.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star size={10} className="fill-amber-500" />
                          <span className="text-[10px] font-bold">{d.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-[10px] text-green-600 font-bold">Available Now</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setAssigningId(null)}
              className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              Cancel and Close
            </button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-8 flex items-center justify-between px-2 pb-10">
        <p className="text-sm font-medium text-gray-400">
          Showing <span className="text-gray-900">{(page-1)*PER_PAGE+1}</span> to <span className="text-gray-900">{Math.min(page*PER_PAGE, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> bookings
        </p>
        <div className="flex gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-100 bg-white disabled:opacity-40 hover:bg-gray-50 transition-all active:scale-95"
          >
            Previous
          </button>
          <button
            disabled={page * PER_PAGE >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-primary-100 bg-primary-50 text-primary-700 disabled:opacity-40 hover:bg-primary-600 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
