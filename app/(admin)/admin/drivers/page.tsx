// app/(admin)/admin/drivers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, CheckCircle, XCircle, Ban, Star, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all')
  const [selected, setSelected] = useState<any>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const supabase = createClient()

  useEffect(() => { fetchDrivers() }, [filter, page])

  async function fetchDrivers() {
    setLoading(true)
    let query = supabase
      .from('drivers')
      .select('*, reviews(rating, comment, created_at)')
      .order('created_at', { ascending: false })

    if (filter === 'pending') query = query.eq('is_approved', false)
    else if (filter === 'approved') query = query.eq('is_approved', true)
    else if (filter === 'blocked') query = query.eq('is_blocked', true)

    const { data: driversData, error: driversError } = await query
    
    if (driversError) {
      console.error('FETCH ERROR:', driversError)
      toast.error('Drivers load nahi ho sakay')
      setDrivers([])
    } else {
      // Har driver ka email alag se fetch karein (Robust approach)
      const formattedDrivers = await Promise.all((driversData || []).map(async (d) => {
        const { data: userData } = await supabase.from('users').select('email').eq('id', d.user_id).single()
        
        let realEarnings = 0
        let realJobs = 0
        const { data: stats } = await supabase.from('bookings').select('final_price').eq('driver_id', d.id).eq('status', 'completed')
        if (stats) {
          realEarnings = stats.reduce((s: number, b: any) => s + (b.final_price || 0), 0)
          realJobs = stats.length
        }
        
        return { ...d, users: userData || { email: 'Missing' }, completed_jobs: realJobs, total_earnings: realEarnings }
      }))
      setDrivers(formattedDrivers)
    }
    setLoading(false)
  }

  const filtered = search
    ? drivers.filter(d =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.phone?.includes(search) ||
        d.users?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : drivers

  async function approveDriver(id: string) {
    const { error } = await supabase
      .from('drivers')
      .update({ is_approved: true })
      .eq('id', id)
    
    if (error) {
      console.error('APPROVE ERROR:', error)
      toast.error(`Approve failing: ${error.message}`)
    } else {
      setDrivers(ds => ds.map(d => d.id === id ? { ...d, is_approved: true } : d))
      toast.success('Driver approved successfully!')
      fetchDrivers() // Force refresh to update filters
    }
  }

  async function rejectDriver(id: string) {
    if (!confirm('Reject this driver application?')) return
    const { error } = await supabase
      .from('drivers')
      .update({ is_approved: false, is_blocked: true })
      .eq('id', id)
    if (!error) {
      fetchDrivers()
      toast.success('Driver rejected')
    }
  }

  async function toggleBlock(id: string, currentBlocked: boolean) {
    const { error } = await supabase
      .from('drivers')
      .update({ is_blocked: !currentBlocked })
      .eq('id', id)
    if (!error) {
      setDrivers(ds => ds.map(d => d.id === id ? { ...d, is_blocked: !currentBlocked } : d))
      toast.success(currentBlocked ? 'Driver unblocked' : 'Driver blocked')
    }
  }

  const pendingCount = drivers.filter(d => !d.is_approved && !d.is_blocked).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Drivers / Workers</h1>
        {pendingCount > 0 && (
          <span className="badge-pending text-sm px-3 py-1">
            {pendingCount} pending approval
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'blocked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn-secondary text-xs px-3 py-2 capitalize ${filter === f ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}`}
              >
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] inline-flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Rating</th>
              <th>Jobs Done</th>
              <th>Earnings</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">No drivers found</td></tr>
            ) : (
              filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {d.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="text-gray-500">{d.phone}</td>
                  <td className="text-gray-500">{d.users?.email}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span>{d.rating?.toFixed(1) || '—'}</span>
                    </div>
                  </td>
                  <td>{d.completed_jobs}</td>
                  <td className="font-medium">SAR {(d.total_earnings || 0).toFixed(0)}</td>
                  <td>
                    {d.is_blocked
                      ? <span className="badge-cancelled">Blocked</span>
                      : d.is_approved
                        ? <span className="badge-active">Approved</span>
                        : <span className="badge-pending">Pending</span>
                    }
                  </td>
                  <td>
                    <div className={`w-2 h-2 rounded-full ${d.is_available && d.is_approved ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(d)} className="btn-secondary text-xs px-2 py-1">
                        <Eye size={12} />
                      </button>
                      {!d.is_approved && !d.is_blocked && (
                        <>
                          <button onClick={() => approveDriver(d.id)} className="btn-success text-xs px-2 py-1">
                            <CheckCircle size={12} />
                          </button>
                          <button onClick={() => rejectDriver(d.id)} className="btn-danger text-xs px-2 py-1">
                            <XCircle size={12} />
                          </button>
                        </>
                      )}
                      {d.is_approved && (
                        <button
                          onClick={() => toggleBlock(d.id, d.is_blocked)}
                          className={d.is_blocked ? 'btn-success text-xs px-2 py-1' : 'btn-danger text-xs px-2 py-1'}
                        >
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Driver Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-xl font-semibold">
                {selected.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-gray-400">{selected.users?.email}</p>
              </div>
              <div className="ml-auto">
                {selected.is_blocked
                  ? <span className="badge-cancelled">Blocked</span>
                  : selected.is_approved
                    ? <span className="badge-active">Approved</span>
                    : <span className="badge-pending">Pending Review</span>
                }
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Jobs Done', value: selected.completed_jobs },
                { label: 'Rating', value: selected.rating?.toFixed(1) || '—' },
                { label: 'Earnings', value: `SAR ${(selected.total_earnings || 0).toFixed(0)}` },
              ].map(s => (
                <div key={s.label} className="stat-card p-3 text-center">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-lg font-semibold mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Phone</span>
                <span>{selected.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">License</span>
                <span>{selected.license_number || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Vehicle Info</span>
                <span>{selected.vehicle_info || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Joined</span>
                <span>{new Date(selected.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Documents */}
            {(selected.license_doc_url || selected.id_doc_url) && (
              <div className="mb-5">
                <p className="text-sm font-medium mb-2">Documents</p>
                <div className="flex gap-2">
                  {selected.license_doc_url && (
                    <a href={selected.license_doc_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                      View License
                    </a>
                  )}
                  {selected.id_doc_url && (
                    <a href={selected.id_doc_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                      View ID
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Reviews */}
            {selected.reviews && selected.reviews.length > 0 && (
              <div className="mb-5 border-t border-gray-100 pt-5">
                <p className="text-sm font-medium mb-3">Customer Reviews</p>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                  {selected.reviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((r: any, i: number) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-sm">{r.rating}/5</span>
                        <span className="text-xs text-gray-400 ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment ? (
                        <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic mt-1">No comment provided</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Close</button>
              {!selected.is_approved && !selected.is_blocked && (
                <button className="btn-primary flex-1" onClick={() => { approveDriver(selected.id); setSelected(null) }}>
                  Approve Driver
                </button>
              )}
              {selected.is_approved && (
                <button
                  className={selected.is_blocked ? 'btn-success flex-1' : 'btn-danger flex-1'}
                  onClick={() => { toggleBlock(selected.id, selected.is_blocked); setSelected(null) }}
                >
                  {selected.is_blocked ? 'Unblock Driver' : 'Block Driver'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
