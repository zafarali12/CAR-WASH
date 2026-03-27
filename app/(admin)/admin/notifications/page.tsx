// app/(admin)/admin/notifications/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Users, User, Car } from 'lucide-react'
import toast from 'react-hot-toast'

type Target = 'all' | 'customers' | 'drivers' | 'individual'
type NotifType = 'booking_update' | 'promotion' | 'reminder' | 'system'

export default function AdminNotifications() {
  const [target, setTarget] = useState<Target>('all')
  const [notifType, setNotifType] = useState<NotifType>('system')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [individualEmail, setIndividualEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(0)

  const supabase = createClient()

  async function sendNotification() {
    if (!title || !message) {
      toast.error('Title and message are required')
      return
    }
    setSending(true)
    try {
      let userIds: string[] = []

      if (target === 'all') {
        const { data } = await supabase.from('users').select('id').eq('is_blocked', false)
        userIds = (data || []).map(u => u.id)
      } else if (target === 'customers') {
        const { data } = await supabase
          .from('users').select('id').eq('role', 'customer').eq('is_blocked', false)
        userIds = (data || []).map(u => u.id)
      } else if (target === 'drivers') {
        const { data } = await supabase
          .from('users').select('id').eq('role', 'driver').eq('is_blocked', false)
        userIds = (data || []).map(u => u.id)
      } else if (target === 'individual' && individualEmail) {
        const { data } = await supabase
          .from('users').select('id').eq('email', individualEmail).single()
        if (data) userIds = [data.id]
        else { toast.error('User not found'); setSending(false); return }
      }

      if (userIds.length === 0) {
        toast.error('No users found for this target')
        setSending(false)
        return
      }

      // Batch insert notifications
      const notifications = userIds.map(id => ({
        user_id: id,
        title,
        message,
        type: notifType,
        is_read: false,
      }))

      const BATCH = 100
      for (let i = 0; i < notifications.length; i += BATCH) {
        await supabase.from('notifications').insert(notifications.slice(i, i + BATCH))
      }

      setSent(userIds.length)
      toast.success(`Notification sent to ${userIds.length} user(s)!`)
      setTitle('')
      setMessage('')
      setIndividualEmail('')
    } catch (err) {
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const targetOptions = [
    { value: 'all', label: 'All Users', icon: Users, desc: 'Send to everyone' },
    { value: 'customers', label: 'Customers', icon: User, desc: 'All customers only' },
    { value: 'drivers', label: 'Drivers', icon: Car, desc: 'All drivers only' },
    { value: 'individual', label: 'Specific User', icon: User, desc: 'By email address' },
  ]

  const typeOptions: { value: NotifType; label: string; color: string }[] = [
    { value: 'system', label: 'System', color: 'badge-assigned' },
    { value: 'promotion', label: 'Promotion', color: 'badge-active' },
    { value: 'reminder', label: 'Reminder', color: 'badge-pending' },
    { value: 'booking_update', label: 'Booking Update', color: 'badge-active' },
  ]

  const templates = [
    { title: 'Service Available!', message: 'New car wash services are now available in your area. Book now and get 10% off!' },
    { title: 'Booking Reminder', message: "You have a car wash booking tomorrow. Please make sure someone is available at the location." },
    { title: 'Special Offer', message: 'This weekend only: Get premium wash for the price of basic! Use code WEEKEND20.' },
    { title: 'App Update', message: 'We have released a new update with exciting features. Please update your app for the best experience.' },
  ]

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Send Notification</h1>
        {sent > 0 && <span className="badge-active">Last sent to {sent} users</span>}
      </div>

      <div className="card p-5 space-y-5">
        {/* Target Selection */}
        <div>
          <label className="label">Send To</label>
          <div className="grid grid-cols-2 gap-2">
            {targetOptions.map(t => (
              <button
                key={t.value}
                onClick={() => setTarget(t.value as Target)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  target === t.value ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  target === t.value ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <t.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {target === 'individual' && (
            <input
              className="input mt-3"
              placeholder="Enter user email address"
              value={individualEmail}
              onChange={e => setIndividualEmail(e.target.value)}
            />
          )}
        </div>

        {/* Notification Type */}
        <div>
          <label className="label">Type</label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(t => (
              <button
                key={t.value}
                onClick={() => setNotifType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  notifType === t.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." maxLength={100} />
        </div>

        {/* Message */}
        <div>
          <label className="label">Message *</label>
          <textarea className="input" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your notification message..." maxLength={500} />
          <p className="text-xs text-gray-400 mt-1">{message.length}/500</p>
        </div>

        {/* Templates */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Quick Templates</p>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => { setTitle(t.title); setMessage(t.message) }}
                className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <p className="text-xs font-medium text-gray-700">{t.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.message}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {(title || message) && (
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Preview</p>
            <div className="p-4 bg-gray-800 rounded-xl text-white">
              <p className="text-xs text-gray-400 mb-1">CarWash</p>
              <p className="text-sm font-semibold mb-1">{title || 'Notification Title'}</p>
              <p className="text-xs text-gray-300">{message || 'Notification message...'}</p>
            </div>
          </div>
        )}

        <button className="btn-primary w-full py-3" onClick={sendNotification} disabled={sending}>
          <Send size={16} />
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>
    </div>
  )
}
