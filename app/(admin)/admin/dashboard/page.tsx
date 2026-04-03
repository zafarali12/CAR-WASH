// app/(admin)/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, Users, Car, CalendarCheck,
  Clock, CheckCircle, XCircle, DollarSign,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays, startOfWeek } from 'date-fns'

const COLORS = ['#185fa5', '#0f6e56', '#854f0b', '#a32d2d', '#5f5e5a']

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_revenue: 0,
    revenue_today: 0,
    revenue_change: 0,
    total_bookings: 0,
    active_bookings: 0,
    total_customers: 0,
    new_customers: 0,
    active_drivers: 0,
    total_drivers: 0,
  })
  const [revenueChart, setRevenueChart] = useState<any[]>([])
  const [bookingStatus, setBookingStatus] = useState<any[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [topDrivers, setTopDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      // Fetch stats
      const [bookingsRes, customersRes, driversRes] = await Promise.all([
        supabase.from('bookings').select('id, status, final_price, scheduled_date, created_at'),
        supabase.from('customers').select('id, created_at'),
        supabase.from('drivers').select('id, is_available, is_approved, name, rating, completed_jobs'),
      ])

      const bookings = bookingsRes.data || []
      const customers = customersRes.data || []
      const drivers = driversRes.data || []

      const today = new Date().toISOString().split('T')[0]
      const yesterday = subDays(new Date(), 1).toISOString().split('T')[0]

      const completedBookings = bookings.filter(b => b.status === 'completed')

      const revenueToday = completedBookings
        .filter(b => b.scheduled_date === today)
        .reduce((sum, b) => sum + (b.final_price || 0), 0)

      const revenueYesterday = completedBookings
        .filter(b => b.scheduled_date === yesterday)
        .reduce((sum, b) => sum + (b.final_price || 0), 0)

      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.final_price || 0), 0)

      setStats({
        total_revenue: totalRevenue,
        revenue_today: revenueToday,
        revenue_change: revenueYesterday ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : 0,
        total_bookings: bookings.length,
        active_bookings: bookings.filter(b => ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress'].includes(b.status)).length,
        total_customers: customers.length,
        new_customers: customers.filter(c => c.created_at.startsWith(today)).length,
        active_drivers: drivers.filter(d => d.is_available && d.is_approved).length,
        total_drivers: drivers.filter(d => d.is_approved).length,
      })

      // Revenue chart (last 7 days)
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dateStr = date.toISOString().split('T')[0]
        const dayRevenue = completedBookings
          .filter(b => b.scheduled_date === dateStr)
          .reduce((sum, b) => sum + (b.final_price || 0), 0)
        const dayBookingsCount = bookings.filter(b => b.created_at.startsWith(dateStr)).length
        chartData.push({
          date: format(date, 'EEE'),
          revenue: dayRevenue,
          bookings: dayBookingsCount,
        })
      }
      setRevenueChart(chartData)

      // Booking status breakdown
      const statusMap: Record<string, number> = {}
      bookings.forEach(b => {
        statusMap[b.status] = (statusMap[b.status] || 0) + 1
      })
      setBookingStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

      // Recent bookings
      const recentRes = await supabase
        .from('bookings')
        .select(`
          id, status, final_price, scheduled_date, scheduled_time, created_at,
          customers(name),
          services(name),
          drivers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(8)
      setRecentBookings(recentRes.data || [])

      // Top drivers
      setTopDrivers(
        drivers
          .filter(d => d.is_approved)
          .sort((a, b) => b.completed_jobs - a.completed_jobs)
          .slice(0, 5)
      )
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `SAR ${stats.total_revenue.toLocaleString()}`,
      sub: `SAR ${stats.revenue_today.toFixed(0)} today`,
      icon: DollarSign,
      trend: stats.revenue_change,
      color: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'Active Bookings',
      value: stats.active_bookings,
      sub: `${stats.total_bookings} total`,
      icon: CalendarCheck,
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Customers',
      value: stats.total_customers.toLocaleString(),
      sub: `+${stats.new_customers} today`,
      icon: Users,
      color: 'text-green-700 bg-green-50',
    },
    {
      label: 'Active Drivers',
      value: stats.active_drivers,
      sub: `${stats.total_drivers} approved`,
      icon: Car,
      color: 'text-blue-700 bg-blue-50',
    },
  ]

  const statusColors: Record<string, string> = {
    pending: 'badge-pending',
    assigned: 'badge-assigned',
    driver_on_way: 'badge-assigned',
    in_progress: 'badge-active',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            {s.trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${s.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {s.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(s.trend).toFixed(1)}% vs yesterday
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#185fa5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#185fa5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(val: any) => [`SAR ${val}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#185fa5" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Status Pie */}
        <div className="card p-5">
          <h3 className="section-title">Booking Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={bookingStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {bookingStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {bookingStatus.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 capitalize">{item.name.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Bookings</h3>
            <a href="/admin/bookings" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {(b.customers?.name || 'U')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.customers?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{b.services?.name} · {b.scheduled_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">SAR {b.final_price}</p>
                  <span className={statusColors[b.status] || 'badge'}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Drivers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Top Drivers</h3>
            <a href="/admin/drivers" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {topDrivers.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-xs font-medium">
                  {d.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.completed_jobs} jobs completed</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="text-xs font-medium">★</span>
                    <span className="text-xs">{d.rating?.toFixed(1) || '—'}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1 ml-auto ${d.is_available ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
