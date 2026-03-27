// app/(admin)/admin/sub-admins/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const PERMISSION_KEYS = [
  { key: 'customers', label: 'Customers' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'services', label: 'Services' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'reports', label: 'Reports' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'cms', label: 'CMS' },
]

const DEFAULT_PERMISSIONS = Object.fromEntries(PERMISSION_KEYS.map(p => [p.key, false]))

export default function AdminSubAdmins() {
  const [subAdmins, setSubAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchSubAdmins() }, [])

  async function fetchSubAdmins() {
    const { data } = await supabase
      .from('sub_admins')
      .select('id, permissions, created_at, users(email, clerk_id)')
      .order('created_at', { ascending: false })
    setSubAdmins(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setEmail('')
    setPermissions(DEFAULT_PERMISSIONS)
    setShowModal(true)
  }

  function openEdit(sa: any) {
    setEditId(sa.id)
    setEmail((sa.users as any)?.email || '')
    setPermissions({ ...DEFAULT_PERMISSIONS, ...(sa.permissions || {}) })
    setShowModal(true)
  }

  async function saveSubAdmin() {
    if (!editId && !email) { toast.error('Email required'); return }
    setSaving(true)
    try {
      if (editId) {
        const { error } = await supabase.from('sub_admins').update({ permissions }).eq('id', editId)
        if (error) throw error
        toast.success('Permissions updated!')
      } else {
        // Find user by email
        const { data: user } = await supabase.from('users').select('id, role').eq('email', email).single()
        if (!user) { toast.error('User not found. They must sign up first.'); setSaving(false); return }
        // Update their role
        await supabase.from('users').update({ role: 'sub_admin' }).eq('id', user.id)
        // Create sub_admin record
        const { error } = await supabase.from('sub_admins').insert({ user_id: user.id, permissions })
        if (error) throw error
        toast.success('Sub-admin created!')
      }
      setShowModal(false)
      fetchSubAdmins()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function removeSubAdmin(id: string, userId: string) {
    if (!confirm('Remove this sub-admin?')) return
    await supabase.from('sub_admins').delete().eq('id', id)
    await supabase.from('users').update({ role: 'customer' }).eq('id', userId)
    setSubAdmins(s => s.filter(sa => sa.id !== id))
    toast.success('Sub-admin removed')
  }

  function togglePermission(key: string) {
    setPermissions(p => ({ ...p, [key]: !p[key] }))
  }

  function setAll(val: boolean) {
    setPermissions(Object.fromEntries(PERMISSION_KEYS.map(p => [p.key, val])))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sub-Admins</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Sub-Admin
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : subAdmins.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No sub-admins yet</p>
          <button className="btn-primary mt-4" onClick={openCreate}>Add Sub-Admin</button>
        </div>
      ) : (
        <div className="space-y-3">
          {subAdmins.map(sa => {
            const perms = sa.permissions || {}
            const activeCount = Object.values(perms).filter(Boolean).length
            return (
              <div key={sa.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="font-semibold">{(sa.users as any)?.email}</p>
                      <p className="text-xs text-gray-400">{activeCount}/{PERMISSION_KEYS.length} permissions · Added {new Date(sa.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs px-2 py-1.5" onClick={() => openEdit(sa)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn-danger text-xs px-2 py-1.5" onClick={() => removeSubAdmin(sa.id, (sa.users as any)?.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PERMISSION_KEYS.map(p => (
                    <span key={p.key} className={`text-xs px-2.5 py-1 rounded-full ${perms[p.key] ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Permissions' : 'Add Sub-Admin'}</h2>

            {!editId && (
              <div className="mb-4">
                <label className="label">User Email *</label>
                <input className="input" type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">User must already have an account</p>
              </div>
            )}

            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Permissions</label>
                <div className="flex gap-2">
                  <button className="text-xs text-primary-600 hover:underline" onClick={() => setAll(true)}>Select All</button>
                  <span className="text-gray-300">|</span>
                  <button className="text-xs text-gray-400 hover:underline" onClick={() => setAll(false)}>Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_KEYS.map(p => (
                  <label key={p.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={permissions[p.key] || false}
                      onChange={() => togglePermission(p.key)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveSubAdmin} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Permissions' : 'Create Sub-Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
