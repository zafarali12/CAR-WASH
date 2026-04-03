// app/(admin)/admin/coupons/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Tag, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { upsertCoupon, deleteCouponAction, toggleCouponActiveAction, fetchCouponsAction } from './actions'

interface CouponForm {
  code: string
  type: 'percentage' | 'fixed' | 'free_service'
  value: string
  min_order_value: string
  max_uses: string
  per_user_limit: string
  valid_from: string
  valid_until: string
  is_active: boolean
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CouponForm>({
    code: '', type: 'percentage', value: '', min_order_value: '0',
    max_uses: '', per_user_limit: '1',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
  })

  const supabase = createClient()

  useEffect(() => { fetchCoupons() }, [])

  async function fetchCoupons() {
    const result = await fetchCouponsAction()
    if (result.data) {
      setCoupons(result.data)
    } else {
      toast.error(result.error || 'Failed to load coupons')
    }
    setLoading(false)
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setForm(f => ({ ...f, code }))
  }

  function openCreate() {
    setEditId(null)
    setForm({
      code: '', type: 'percentage', value: '', min_order_value: '0',
      max_uses: '', per_user_limit: '1',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
    })
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditId(c.id)
    setForm({
      code: c.code,
      type: c.type,
      value: c.value.toString(),
      min_order_value: c.min_order_value?.toString() || '0',
      max_uses: c.max_uses?.toString() || '',
      per_user_limit: c.per_user_limit?.toString() || '1',
      valid_from: c.valid_from.split('T')[0],
      valid_until: c.valid_until.split('T')[0],
      is_active: c.is_active,
    })
    setShowModal(true)
  }

  async function saveCoupon() {
    if (!form.code || !form.value || !form.valid_until) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_order_value: parseFloat(form.min_order_value) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      per_user_limit: parseInt(form.per_user_limit) || 1,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      is_active: form.is_active,
    }
    const result = await upsertCoupon(payload, editId)

    if (result.error) {
      toast.error(result.error || 'Failed to save coupon')
    } else {
      toast.success(editId ? 'Coupon updated!' : 'Coupon created!')
      setShowModal(false)
      fetchCoupons()
    }
    setSaving(false)
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Delete this coupon?')) return
    const result = await deleteCouponAction(id)
    if (!result.error) {
      setCoupons(cs => cs.filter(c => c.id !== id))
      toast.success('Coupon deleted')
    } else {
      toast.error(result.error)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const result = await toggleCouponActiveAction(id, current)
    if (!result.error) {
      setCoupons(cs => cs.map(c => c.id === id ? { ...c, is_active: !current } : c))
    } else {
      toast.error(result.error)
    }
  }

  function formatValue(c: any) {
    if (c.type === 'percentage') return `${c.value}% off`
    if (c.type === 'fixed') return `SAR ${c.value} off`
    return 'Free service'
  }

  function isExpired(validUntil: string) {
    return new Date(validUntil) < new Date()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Coupons</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Coupons', value: coupons.length },
          { label: 'Active', value: coupons.filter(c => c.is_active && !isExpired(c.valid_until)).length },
          { label: 'Expired', value: coupons.filter(c => isExpired(c.valid_until)).length },
          { label: 'Total Used', value: coupons.reduce((s, c) => s + c.used_count, 0) },
        ].map(s => (
          <div key={s.label} className="stat-card p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-semibold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className={`card p-5 ${!c.is_active || isExpired(c.valid_until) ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <Tag size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold tracking-wider">{c.code}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied!') }}
                        className="text-gray-300 hover:text-gray-500"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 capitalize">{c.type.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div>
                  {isExpired(c.valid_until)
                    ? <span className="badge-cancelled text-xs">Expired</span>
                    : c.is_active
                      ? <span className="badge-active text-xs">Active</span>
                      : <span className="badge-pending text-xs">Inactive</span>
                  }
                </div>
              </div>

              <p className="text-2xl font-bold text-primary-600 mb-1">{formatValue(c)}</p>

              <div className="space-y-1 text-xs text-gray-400 mb-4">
                {c.min_order_value > 0 && <p>Min order: SAR {c.min_order_value}</p>}
                <p>Used: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ' times'}</p>
                <p>Valid: {format(new Date(c.valid_from), 'MMM d')} – {format(new Date(c.valid_until), 'MMM d, yyyy')}</p>
                {c.per_user_limit && <p>Per user: {c.per_user_limit} use(s)</p>}
              </div>

              {/* Usage bar */}
              {c.max_uses && (
                <div className="mb-4">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-400 rounded-full"
                      style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{c.used_count}/{c.max_uses} uses</p>
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs" onClick={() => openEdit(c)}>
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => toggleActive(c.id, c.is_active)}
                  className="btn-secondary text-xs px-3"
                >
                  {c.is_active ? 'Disable' : 'Enable'}
                </button>
                <button className="btn-danger text-xs px-3" onClick={() => deleteCoupon(c.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Coupon' : 'Create Coupon'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Coupon Code *</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
                  <button className="btn-secondary text-xs px-3" onClick={generateCode}>Generate</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (SAR)</option>
                    <option value="free_service">Free Service</option>
                  </select>
                </div>
                <div>
                  <label className="label">Value *</label>
                  <input className="input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percentage' ? '20' : '10'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Order (SAR)</label>
                  <input className="input" type="number" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Uses</label>
                  <input className="input" type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" />
                </div>
              </div>
              <div>
                <label className="label">Per User Limit</label>
                <input className="input" type="number" value={form.per_user_limit} onChange={e => setForm(f => ({ ...f, per_user_limit: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valid From *</label>
                  <input className="input" type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Valid Until *</label>
                  <input className="input" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="coupon-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="coupon-active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveCoupon} disabled={saving}>
                {saving ? 'Saving...' : 'Save Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
