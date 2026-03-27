// app/(admin)/admin/services/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Clock, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

interface ServiceForm {
  name: string
  description: string
  price: string
  duration: string
  category: string
  features: string
  is_active: boolean
}

const CATEGORIES = [
  { value: 'basic_wash', label: 'Basic Wash' },
  { value: 'premium_wash', label: 'Premium Wash' },
  { value: 'interior_clean', label: 'Interior Clean' },
  { value: 'exterior_detail', label: 'Exterior Detail' },
  { value: 'full_detail', label: 'Full Detail' },
  { value: 'custom', label: 'Custom' },
]

const SERVICE_ICONS: Record<string, string> = {
  basic_wash: '🚿',
  premium_wash: '✨',
  interior_clean: '🪟',
  exterior_detail: '🔆',
  full_detail: '💎',
  custom: '⚙️',
}

export default function AdminServices() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceForm>({
    name: '', description: '', price: '', duration: '',
    category: 'basic_wash', features: '', is_active: true
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('sort_order')
    setServices(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm({ name: '', description: '', price: '', duration: '', category: 'basic_wash', features: '', is_active: true })
    setShowModal(true)
  }

  function openEdit(s: any) {
    setEditId(s.id)
    setForm({
      name: s.name,
      description: s.description || '',
      price: s.price.toString(),
      duration: s.duration.toString(),
      category: s.category,
      features: (s.features || []).join(', '),
      is_active: s.is_active,
    })
    setShowModal(true)
  }

  async function saveService() {
    if (!form.name || !form.price || !form.duration) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      duration: parseInt(form.duration),
      category: form.category,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      is_active: form.is_active,
    }

    const { error } = editId
      ? await supabase.from('services').update(payload).eq('id', editId)
      : await supabase.from('services').insert(payload)

    if (error) {
      toast.error('Failed to save service')
    } else {
      toast.success(editId ? 'Service updated!' : 'Service created!')
      setShowModal(false)
      fetchServices()
    }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !current })
      .eq('id', id)
    if (!error) {
      setServices(s => s.map(svc => svc.id === id ? { ...svc, is_active: !current } : svc))
      toast.success(current ? 'Service deactivated' : 'Service activated')
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) {
      setServices(s => s.filter(svc => svc.id !== id))
      toast.success('Service deleted')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Service
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className={`card p-5 ${!s.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">
                    {SERVICE_ICONS[s.category] || '🚗'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{s.category.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={s.is_active ? 'text-green-500' : 'text-gray-300'}
                  >
                    {s.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{s.description}</p>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-primary-600">
                  <DollarSign size={14} />
                  {s.price}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock size={14} />
                  {s.duration} min
                </div>
              </div>

              {s.features?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {s.features.slice(0, 3).map((f: string) => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f}</span>
                  ))}
                  {s.features.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">+{s.features.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs" onClick={() => openEdit(s)}>
                  <Edit2 size={12} /> Edit
                </button>
                <button className="btn-danger text-xs px-3" onClick={() => deleteService(s.id)}>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Service' : 'Add New Service'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Wash" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Service description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price ($) *</label>
                  <input className="input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="30" />
                </div>
                <div>
                  <label className="label">Duration (min) *</label>
                  <input className="input" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="60" />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Features (comma separated)</label>
                <input className="input" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Exterior wash, Wax, Tire shine" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="active" className="text-sm text-gray-700">Active (visible to customers)</label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveService} disabled={saving}>
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
