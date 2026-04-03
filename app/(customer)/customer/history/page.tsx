// app/(customer)/customer/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Clock, Calendar, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
}

export default function BookingHistory() {
  const { user } = useUser()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [user])

  async function fetchHistory() {
    if (!user?.id) return
    
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return

    const custRes = await supabase.from('customers').select('id').eq('user_id', userRes.data.id).single()
    if (custRes.data) {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, scheduled_date, final_price, created_at,
          services(name),
          vehicles(make, model)
        `)
        .eq('customer_id', custRes.data.id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
      
      setHistory(data || [])
    }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Booking History</h1>
      </div>

      {history.length === 0 ? (
        <div className="card p-10 text-center">
          <Clock size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">No past bookings found</p>
          <Link href="/customer/services" className="text-primary-600 text-sm font-medium mt-2 block">Book now</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(b => {
             const config = STATUS_CONFIG[b.status] || { label: b.status, icon: Clock, color: 'bg-gray-50 text-gray-600' }
             return (
              <Link key={b.id} href={`/customer/bookings/${b.id}`} className="card p-4 block hover:border-primary-100 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                    <config.icon size={12} />
                    {config.label}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                
                <h3 className="font-semibold text-gray-900">{b.services?.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{b.vehicles?.make} {b.vehicles?.model}</p>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                   <div className="flex items-center gap-1 text-xs text-gray-400">
                     <Calendar size={12} />
                     {b.scheduled_date}
                   </div>
                   <div className="text-sm font-bold text-gray-900">SAR {b.final_price}</div>
                </div>
              </Link>
             )
          })}
        </div>
      )}
    </div>
  )
}
