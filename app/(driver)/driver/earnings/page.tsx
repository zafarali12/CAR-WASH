// app/(driver)/driver/earnings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { subDays, startOfWeek, startOfMonth, format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type Period = 'today' | 'week' | 'month'

export default function DriverEarnings() {
  const { user } = useUser()
  const [period, setPeriod] = useState<Period>('week')
  const [earnings, setEarnings] = useState({ total: 0, jobs: 0, avg: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => { fetchEarnings() }, [period])

  async function fetchEarnings() {
    setLoading(true)
    if (!user?.id) return

    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return
    const driverRes = await supabase.from('drivers').select('id').eq('user_id', userRes.data.id).single()
    if (!driverRes.data) return

    const now = new Date()
    let fromDate: Date
    if (period === 'today') fromDate = new Date(now.toISOString().split('T')[0])
    else if (period === 'week') fromDate = startOfWeek(now)
    else fromDate = startOfMonth(now)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, final_price, scheduled_date, scheduled_time, status, services(name), created_at')
      .eq('driver_id', driverRes.data.id)
      .eq('status', 'completed')
      .gte('scheduled_date', fromDate.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: false })

    const jobs = bookings || []
    const total = jobs.reduce((s: number, b: any) => s + b.final_price, 0)
    setEarnings({ total, jobs: jobs.length, avg: jobs.length ? total / jobs.length : 0 })
    setHistory(jobs)

    // Build chart
    if (period === 'today') {
      const hours: any = {}
      jobs.forEach((b: any) => {
        const h = b.scheduled_time?.slice(0, 2) + ':00'
        hours[h] = (hours[h] || 0) + b.final_price
      })
      setChartData(
        Array.from({ length: 10 }, (_, i) => {
          const h = String(8 + i).padStart(2, '0') + ':00'
          return { label: h, amount: hours[h] || 0 }
        })
      )
    } else if (period === 'week') {
      const days: any = {}
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i)
        days[d.toISOString().split('T')[0]] = 0
      }
      jobs.forEach((b: any) => { if (days[b.scheduled_date] !== undefined) days[b.scheduled_date] += b.final_price })
      setChartData(Object.entries(days).map(([date, amount]) => ({
        label: format(new Date(date), 'EEE'),
        amount,
      })))
    } else {
      // Monthly by week
      const weeks: any = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 }
      jobs.forEach((b: any) => {
        const d = new Date(b.scheduled_date)
        const w = Math.ceil(d.getDate() / 7)
        weeks[`Week ${w}`] = (weeks[`Week ${w}`] || 0) + b.final_price
      })
      setChartData(Object.entries(weeks).map(([label, amount]) => ({ label, amount })))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Earnings</h1>

      {/* Period Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(['today', 'week', 'month'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Earned', value: `SAR ${earnings.total.toFixed(0)}` },
          { label: 'Jobs Done', value: earnings.jobs },
          { label: 'Avg per Job', value: `SAR ${earnings.avg.toFixed(0)}` },
        ].map(s => (
          <div key={s.label} className="stat-card p-3 text-center">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-4">
        <h3 className="font-medium mb-3 text-sm">Earnings Chart</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              formatter={(v: any) => [`SAR ${v}`, 'Earned']}
            />
            <Bar dataKey="amount" fill="#0f6e56" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* History */}
      <div className="card p-4">
        <h3 className="font-medium mb-3 text-sm">Job History</h3>
        {loading ? (
          <p className="text-center text-gray-400 py-4 text-sm">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">No completed jobs this {period}</p>
        ) : (
          <div className="space-y-2">
            {history.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-[10px] font-bold">
                  SAR
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{b.services?.name}</p>
                  <p className="text-xs text-gray-400">{b.scheduled_date} · {b.scheduled_time?.slice(0, 5)}</p>
                </div>
                <p className="font-semibold text-green-600">SAR {b.final_price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
