// app/(admin)/admin/customers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Eye, Ban, CheckCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const PER_PAGE = 20

  const supabase = createClient()

  useEffect(() => { fetchCustomers() }, [page])

  async function fetchCustomers() {
    setLoading(true)
    const { data, count } = await supabase
      .from('customers')
      .select(`
        id, name, profile_photo, city, is_blocked, created_at,
        users(email, phone),
        vehicles(id),
        bookings(id, final_price, status)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

    setCustomers(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const filtered = search
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.users?.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.users?.phone?.includes(search)
      )
    : customers

  async function toggleBlock(id: string, currentBlocked: boolean) {
    const { error } = await supabase
      .from('customers')
      .update({ is_blocked: !currentBlocked })
      .eq('id', id)
    if (!error) {
      setCustomers(cs => cs.map(c => c.id === id ? { ...c, is_blocked: !currentBlocked } : c))
      toast.success(currentBlocked ? 'Customer unblocked' : 'Customer blocked')
    }
  }

  function getStats(customer: any) {
    const bookings = customer.bookings || []
    const totalSpent = bookings
      .filter((b: any) => b.status === 'completed')
      .reduce((s: number, b: any) => s + (b.final_price || 0), 0)
    return {
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b: any) => b.status === 'completed').length,
      totalSpent,
      vehicles: customer.vehicles?.length || 0,
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <button className="btn-secondary">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>Bookings</th>
              <th>Total Spent</th>
              <th>Vehicles</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">No customers found</td></tr>
            ) : (
              filtered.map(c => {
                const stats = getStats(c)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {c.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-500">{c.users?.email}</td>
                    <td className="text-gray-500">{c.users?.phone || '—'}</td>
                    <td className="text-gray-500">{c.city || '—'}</td>
                    <td>{stats.totalBookings}</td>
                    <td className="font-medium">SAR {stats.totalSpent.toFixed(0)}</td>
                    <td>{stats.vehicles}</td>
                    <td>
                      {c.is_blocked
                        ? <span className="badge-cancelled">Blocked</span>
                        : <span className="badge-active">Active</span>
                      }
                    </td>
                    <td className="text-gray-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(c)}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => toggleBlock(c.id, c.is_blocked)}
                          className={c.is_blocked ? 'btn-success text-xs px-2 py-1' : 'btn-danger text-xs px-2 py-1'}
                        >
                          {c.is_blocked ? <CheckCircle size={12} /> : <Ban size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <p>Total: {total} customers</p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
          <button disabled={page * PER_PAGE >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xl font-semibold">
                {selected.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-gray-400">{selected.users?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Total Bookings', value: getStats(selected).totalBookings },
                { label: 'Completed', value: getStats(selected).completedBookings },
                { label: 'Total Spent', value: `SAR ${getStats(selected).totalSpent.toFixed(0)}` },
                { label: 'Vehicles', value: getStats(selected).vehicles },
              ].map(s => (
                <div key={s.label} className="stat-card p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-lg font-semibold mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-400">Phone</span><span>{selected.users?.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">City</span><span>{selected.city || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Joined</span><span>{new Date(selected.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span>
                <span className={selected.is_blocked ? 'badge-cancelled' : 'badge-active'}>
                  {selected.is_blocked ? 'Blocked' : 'Active'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Close</button>
              <button
                className={selected.is_blocked ? 'btn-success flex-1' : 'btn-danger flex-1'}
                onClick={() => { toggleBlock(selected.id, selected.is_blocked); setSelected(null) }}
              >
                {selected.is_blocked ? 'Unblock' : 'Block Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
