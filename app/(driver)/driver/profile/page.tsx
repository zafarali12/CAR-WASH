// app/(driver)/driver/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { Star, LogOut, Upload, CheckCircle, Clock, Award } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DriverProfile() {
  const { user } = useUser()
  const [driver, setDriver] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ vehicle_info: '', license_number: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchProfile() }, [user])

  async function fetchProfile() {
    if (!user?.id) return
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return
    const driverRes = await supabase
      .from('drivers')
      .select('*, users(email, phone)')
      .eq('user_id', userRes.data.id)
      .single()
    if (driverRes.data) {
      const statsRes = await supabase
        .from('bookings')
        .select('final_price')
        .eq('driver_id', driverRes.data.id)
        .eq('status', 'completed')
        
      const realEarnings = (statsRes.data || []).reduce((s: number, b: any) => s + (b.final_price || 0), 0)
      const realJobs = (statsRes.data || []).length
      
      setDriver({ ...driverRes.data, total_earnings: realEarnings, completed_jobs: realJobs })
      setForm({ vehicle_info: driverRes.data.vehicle_info || '', license_number: driverRes.data.license_number || '' })
    }
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('drivers').update(form).eq('id', driver.id)
    if (!error) { toast.success('Profile updated!'); setEditing(false); fetchProfile() }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" /></div>

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl font-bold">
            {driver?.name?.[0] || user?.firstName?.[0] || 'D'}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{driver?.name || user?.fullName}</h1>
            <p className="text-sm text-gray-400">{(driver?.users as any)?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {driver?.is_approved ? (
                <span className="badge-active text-xs flex items-center gap-1">
                  <CheckCircle size={10} /> Verified Driver
                </span>
              ) : (
                <span className="badge-pending text-xs flex items-center gap-1">
                  <Clock size={10} /> Pending Approval
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Star size={14} className="fill-amber-400" />
              <span className="font-bold">{driver?.rating?.toFixed(1) || '—'}</span>
            </div>
            <p className="text-xs text-gray-400">Rating</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="font-bold text-lg">{driver?.completed_jobs || 0}</p>
            <p className="text-xs text-gray-400">Jobs Done</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="font-bold text-lg">${(driver?.total_earnings || 0).toFixed(0)}</p>
            <p className="text-xs text-gray-400">Earned</p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Profile Details</h2>
          <button
            onClick={() => editing ? saveProfile() : setEditing(true)}
            disabled={saving}
            className={editing ? 'btn-primary text-sm px-4 py-2' : 'btn-secondary text-sm px-4 py-2'}
          >
            {editing ? (saving ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Full Name', value: driver?.name || user?.fullName },
            { label: 'Email', value: (driver?.users as any)?.email },
            { label: 'Phone', value: (driver?.users as any)?.phone || user?.primaryPhoneNumber?.phoneNumber || '—' },
          ].map(f => (
            <div key={f.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
              <span className="text-gray-400">{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}

          <div>
            <label className="label">License Number</label>
            {editing ? (
              <input className="input" value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
            ) : (
              <p className="text-sm font-medium py-1">{driver?.license_number || '—'}</p>
            )}
          </div>

          <div>
            <label className="label">Vehicle Info</label>
            {editing ? (
              <input className="input" placeholder="e.g. Honda Civic 2020, White" value={form.vehicle_info} onChange={e => setForm(f => ({ ...f, vehicle_info: e.target.value }))} />
            ) : (
              <p className="text-sm font-medium py-1">{driver?.vehicle_info || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Documents</h2>
        <div className="space-y-3">
          {[
            { label: 'Driver License', url: driver?.license_doc_url, key: 'license_doc_url' },
            { label: 'National ID / CNIC', url: driver?.id_doc_url, key: 'id_doc_url' },
          ].map(doc => (
            <div key={doc.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.url ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {doc.url ? <CheckCircle size={16} /> : <Upload size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-gray-400">{doc.url ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
              </div>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1.5">View</a>
              ) : (
                <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
                  Upload
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const path = `documents/${driver.id}/${doc.key}`
                    const { data, error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
                    if (!error) {
                      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
                      await supabase.from('drivers').update({ [doc.key]: urlData.publicUrl }).eq('id', driver.id)
                      toast.success('Document uploaded!')
                      fetchProfile()
                    }
                  }} />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Achievement */}
      {driver?.completed_jobs >= 50 && (
        <div className="card p-4 border-amber-100 bg-amber-50">
          <div className="flex items-center gap-3">
            <Award size={24} className="text-amber-500" />
            <div>
              <p className="font-semibold text-amber-800">Top Driver Badge</p>
              <p className="text-xs text-amber-600">Completed {driver.completed_jobs}+ jobs!</p>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <SignOutButton>
        <button className="w-full btn-danger py-3 flex items-center justify-center gap-2">
          <LogOut size={16} /> Sign Out
        </button>
      </SignOutButton>
    </div>
  )
}
