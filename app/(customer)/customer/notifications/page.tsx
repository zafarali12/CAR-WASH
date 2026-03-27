// app/(customer)/customer/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_ICONS: Record<string, string> = {
  booking_update: '📋', promotion: '🎁', reminder: '⏰', system: '🔔',
}

export default function CustomerNotifications() {
  const { user } = useUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchNotifications() }, [user])

  async function fetchNotifications() {
    if (!user?.id) return
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userRes.data.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  async function markAllRead() {
    if (!user?.id) return
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userRes.data.id).eq('is_read', false)
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Notifications {unreadCount > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({unreadCount} unread)</span>}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-xs gap-1">
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full card p-4 text-left flex items-start gap-3 transition-colors ${!n.is_read ? 'border-primary-100 bg-primary-50/30' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_ICONS[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
