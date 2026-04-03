// app/(admin)/admin/revenue/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminRevenue() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [serviceRevenue, setServiceRevenue] = useState<any[]>([])
  const [driverRevenue, setDriverRevenue] = useState<any[]>([])
  const [totals, setTotals] = useState({ revenue: 0, bookings: 0, avgOrderValue: 0, drivers: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchRevenue() }, [period])

  async function fetchRevenue() {
    setLoading(true)
    const now = new Date()
    let fromDate: string
    if (period === 'week') fromDate = subDays(now, 8).toISOString().split('T')[0] // Slightly wider range for safety
    else if (period === 'month') fromDate = startOfMonth(now).toISOString().split('T')[0]
    else fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, final_price, scheduled_date, driver_id, services(name), drivers(name)')
      .eq('status', 'completed')
      .gte('scheduled_date', fromDate)

    if (error) {
      console.error('REVENUE FETCH ERROR:', error)
      toast.error('Revenue load karte waqt error aya')
      setLoading(false)
      return
    }

    const completed = bookings || []
    console.log(`Found ${completed.length} completed bookings since ${fromDate}`)

    const totalRev = completed.reduce((s: number, b: any) => s + (b.final_price || 0), 0)
    const uniqueDrivers = new Set(completed.map((b: any) => b.driver_id).filter(Boolean)).size
    
    setTotals({
      revenue: totalRev,
      bookings: completed.length,
      avgOrderValue: completed.length ? totalRev / completed.length : 0,
      drivers: uniqueDrivers,
    })

    // Data points processing
    const sortedBookings = [...completed].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    
    // Revenue trend processing
    const trendMap: Record<string, number> = {}
    sortedBookings.forEach(b => {
      const dateStr = b.scheduled_date
      trendMap[dateStr] = (trendMap[dateStr] || 0) + (b.final_price || 0)
    })

    setRevenueData(Object.entries(trendMap).map(([date, revenue]) => ({
      date: format(new Date(date), period === 'year' ? 'MMM' : 'MMM d'),
      revenue
    })))

    // Revenue by service
    const svcMap: Record<string, { name: string; revenue: number; count: number }> = {}
    completed.forEach((b: any) => {
      const name = b.services?.name || 'Uncategorized'
      if (!svcMap[name]) svcMap[name] = { name, revenue: 0, count: 0 }
      svcMap[name].revenue += (b.final_price || 0)
      svcMap[name].count++
    })
    setServiceRevenue(Object.values(svcMap).sort((a, b) => b.revenue - a.revenue))

    // Revenue by driver
    const drvMap: Record<string, { name: string; revenue: number; jobs: number }> = {}
    completed.forEach((b: any) => {
      const name = b.drivers?.name || 'Unknown Driver'
      if (!drvMap[name]) drvMap[name] = { name, revenue: 0, jobs: 0 }
      drvMap[name].revenue += (b.final_price || 0)
      drvMap[name].jobs++
    })
    setDriverRevenue(Object.values(drvMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10))

    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Revenue</h1>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['week', 'month', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? 'bg-white shadow-sm' : 'text-gray-500'}`}>{p}</button>
            ))}
          </div>
          <button className="btn-secondary text-sm"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `SAR ${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}` },
          { label: 'Total Bookings', value: totals.bookings },
          { label: 'Avg Order Value', value: `SAR ${totals.avgOrderValue.toFixed(0)}` },
          { label: 'Active Drivers', value: totals.drivers },
        ].map(s => (
          <div key={s.label} className="stat-card p-5">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#185fa5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#185fa5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => [`SAR ${v}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#185fa5" strokeWidth={2} fill="url(#revGrad2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Service */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Revenue by Service</h3>
          {serviceRevenue.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
            <div className="space-y-3">
              {serviceRevenue.map((s, i) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500">SAR {s.revenue.toFixed(0)} ({s.count} jobs)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.revenue / serviceRevenue[0].revenue) * 100}%`,
                        background: ['#185fa5', '#0f6e56', '#854f0b', '#a32d2d', '#5f5e5a'][i % 5]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by Driver */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Top Drivers by Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={driverRevenue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: any) => [`SAR ${v}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#0f6e56" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
