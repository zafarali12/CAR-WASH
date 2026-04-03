// app/(admin)/admin/reports/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'

type ReportType = 'bookings' | 'revenue' | 'drivers' | 'customers' | 'services'

export default function AdminReports() {
  const [reportType, setReportType] = useState<ReportType>('bookings')
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<any[]>([])

  const supabase = createClient()

  const reportTypes = [
    { key: 'bookings', label: 'Booking Report', icon: '📋', desc: 'All bookings with status and revenue' },
    { key: 'revenue', label: 'Revenue Report', icon: '💰', desc: 'Revenue breakdown by date and service' },
    { key: 'drivers', label: 'Driver Performance', icon: '🚗', desc: 'Driver jobs, ratings, and earnings' },
    { key: 'customers', label: 'Customer Activity', icon: '👥', desc: 'Customer spending and booking history' },
    { key: 'services', label: 'Service Popularity', icon: '⭐', desc: 'Most booked services and revenue' },
  ]

  const quickRanges = [
    { label: 'Today', from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Last 7 Days', from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'This Month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Last Month', from: format(startOfMonth(subDays(startOfMonth(new Date()), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subDays(startOfMonth(new Date()), 1)), 'yyyy-MM-dd') },
  ]

  async function generateReport() {
    setGenerating(true)
    try {
      let data: any[] = []

      if (reportType === 'bookings') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, status, total_price, final_price, payment_status, scheduled_date, scheduled_time, address, created_at, customers(name), drivers(name), services(name), vehicles(make, model, plate_number)')
          .gte('scheduled_date', dateFrom)
          .lte('scheduled_date', dateTo)
          .order('scheduled_date', { ascending: false })
        data = (bookings || []).map(b => ({
          'Booking ID': b.id.slice(0, 8),
          'Date': b.scheduled_date,
          'Time': b.scheduled_time?.slice(0, 5),
          'Customer': (b.customers as any)?.name,
          'Driver': (b.drivers as any)?.name || 'Unassigned',
          'Service': (b.services as any)?.name,
          'Vehicle': `${(b.vehicles as any)?.make} ${(b.vehicles as any)?.model}`,
          'Plate': (b.vehicles as any)?.plate_number,
          'Amount': `SAR ${b.final_price}`,
          'Status': b.status,
          'Payment': b.payment_status,
          'Address': b.address,
        }))
      }

      else if (reportType === 'revenue') {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, payment_method, status, created_at, bookings(scheduled_date, services(name), customers(name))')
          .eq('status', 'paid')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59')
          .order('created_at', { ascending: false })
        data = (payments || []).map(p => ({
          'Date': format(new Date(p.created_at), 'yyyy-MM-dd'),
          'Customer': (p.bookings as any)?.customers?.name,
          'Service': (p.bookings as any)?.services?.name,
          'Amount': `SAR ${p.amount}`,
          'Payment Method': p.payment_method,
          'Status': p.status,
        }))
      }

      else if (reportType === 'drivers') {
        const { data: drivers } = await supabase
          .from('drivers')
          .select('name, phone, rating, completed_jobs, total_earnings, is_approved, is_available, created_at')
          .eq('is_approved', true)
          .order('completed_jobs', { ascending: false })
        data = (drivers || []).map(d => ({
          'Name': d.name,
          'Phone': d.phone,
          'Rating': d.rating?.toFixed(1) || '—',
          'Jobs Completed': d.completed_jobs,
          'Total Earnings': `SAR ${(d.total_earnings || 0).toFixed(0)}`,
          'Status': d.is_available ? 'Online' : 'Offline',
          'Joined': format(new Date(d.created_at), 'yyyy-MM-dd'),
        }))
      }

      else if (reportType === 'customers') {
        const { data: customers } = await supabase
          .from('customers')
          .select('name, city, created_at, users(email, phone), bookings(final_price, status)')
          .order('created_at', { ascending: false })
        data = (customers || []).map(c => {
          const bookings = (c.bookings as any[]) || []
          const spent = bookings.filter(b => b.status === 'completed').reduce((s: number, b: any) => s + b.final_price, 0)
          return {
            'Name': c.name,
            'Email': (c.users as any)?.email,
            'Phone': (c.users as any)?.phone || '—',
            'City': c.city || '—',
            'Total Bookings': bookings.length,
            'Completed': bookings.filter((b: any) => b.status === 'completed').length,
            'Total Spent': `SAR ${spent.toFixed(0)}`,
            'Joined': format(new Date(c.created_at), 'yyyy-MM-dd'),
          }
        })
      }

      else if (reportType === 'services') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('status, final_price, services(name, price, category)')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59')
        const svcMap: Record<string, any> = {}
        ;(bookings || []).forEach((b: any) => {
          const name = b.services?.name || 'Unknown'
          if (!svcMap[name]) svcMap[name] = { name, bookings: 0, completed: 0, revenue: 0, category: b.services?.category }
          svcMap[name].bookings++
          if (b.status === 'completed') { svcMap[name].completed++; svcMap[name].revenue += b.final_price }
        })
        data = Object.values(svcMap)
          .sort((a, b) => b.revenue - a.revenue)
          .map(s => ({
            'Service': s.name,
            'Category': s.category,
            'Total Bookings': s.bookings,
            'Completed': s.completed,
            'Revenue': `SAR ${s.revenue.toFixed(0)}`,
            'Completion Rate': `${s.bookings ? Math.round((s.completed / s.bookings) * 100) : 0}%`,
          }))
      }

      setPreview(data)
      if (data.length === 0) toast('No data found for this period', { icon: 'ℹ️' })
      else toast.success(`${data.length} records loaded`)
    } catch (err) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  function exportCSV() {
    if (!preview.length) return
    const headers = Object.keys(preview[0])
    const rows = preview.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}_report_${dateFrom}_to_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        {preview.length > 0 && (
          <button className="btn-primary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Report Type */}
        <div className="lg:col-span-2 card p-5">
          <p className="label mb-3">Report Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {reportTypes.map(r => (
              <button
                key={r.key}
                onClick={() => { setReportType(r.key as ReportType); setPreview([]) }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  reportType === r.key ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-xl">{r.icon}</span>
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="card p-5">
          <p className="label mb-3">Date Range</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {quickRanges.map(q => (
              <button
                key={q.label}
                onClick={() => { setDateFrom(q.from); setDateTo(q.to); setPreview([]) }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreview([]) }} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreview([]) }} />
            </div>
          </div>
          <button className="btn-primary w-full mt-4" onClick={generateReport} disabled={generating}>
            <FileText size={16} />
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="font-semibold text-sm">{preview.length} records</p>
            <button className="btn-secondary text-xs gap-1" onClick={exportCSV}>
              <Download size={12} /> Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="max-w-xs truncate">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="text-xs text-gray-400 text-center py-3">Showing 50 of {preview.length} records. Export CSV for full data.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
