'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CancellationReasons() {
  const [reasons, setReasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [type, setType] = useState<'customer' | 'driver'>('customer')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { fetchReasons() }, [])

  async function fetchReasons() {
    const { data } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .order('type', { ascending: false })
    setReasons(data || [])
    setLoading(false)
  }

  async function saveReason() {
    if (!reason) { toast.error('Reason text is required'); return }
    setSaving(true)
    const payload = { reason, type, is_active: true }
    const { error } = editId
      ? await supabase.from('cancellation_reasons').update(payload).eq('id', editId)
      : await supabase.from('cancellation_reasons').insert(payload)
    
    if (error) {
      console.error('SAVE ERROR:', error)
      toast.error(`Save failed: ${error.message}`)
    } else {
      toast.success(editId ? 'Reason updated!' : 'Reason added!')
      setShowModal(false)
      fetchReasons()
    }
    setSaving(false)
  }

  async function deleteReason(id: string) {
    if (!confirm('Delete this cancellation reason?')) return
    const { error } = await supabase.from('cancellation_reasons').delete().eq('id', id)
    if (!error) {
      setReasons(r => r.filter(x => x.id !== id))
      toast.success('Reason deleted')
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cancellation Reasons</h1>
          <p className="text-sm text-gray-500 font-medium">Manage predefined reasons for booking cancellations</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditId(null); setReason(''); setShowModal(true) }}>
          <Plus size={16} /> Add Reason
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Reasons */}
        <div className="card border-none shadow-sm bg-white overflow-hidden rounded-2xl">
          <div className="bg-primary-50 px-5 py-3 border-b border-primary-100 flex items-center justify-between">
            <h2 className="font-bold text-primary-900 text-sm uppercase tracking-wider">Customer Reasons</h2>
            <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {reasons.filter(r => r.type === 'customer').length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {reasons.filter(r => r.type === 'customer').map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <span className="text-sm font-medium text-gray-700">{r.reason}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(r.id); setReason(r.reason); setType('customer'); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteReason(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {reasons.filter(r => r.type === 'customer').length === 0 && (
              <div className="p-10 text-center text-gray-400 text-sm italic">No customer reasons added yet</div>
            )}
          </div>
        </div>

        {/* Driver Reasons */}
        <div className="card border-none shadow-sm bg-white overflow-hidden rounded-2xl">
          <div className="bg-green-50 px-5 py-3 border-b border-green-100 flex items-center justify-between">
            <h2 className="font-bold text-green-900 text-sm uppercase tracking-wider">Driver Reasons</h2>
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {reasons.filter(r => r.type === 'driver').length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {reasons.filter(r => r.type === 'driver').map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <span className="text-sm font-medium text-gray-700">{r.reason}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(r.id); setReason(r.reason); setType('driver'); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteReason(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {reasons.filter(r => r.type === 'driver').length === 0 && (
              <div className="p-10 text-center text-gray-400 text-sm italic">No driver reasons added yet</div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <XCircle size={24} />
              </div>
              <h2 className="text-xl font-bold">{editId ? 'Edit Reason' : 'Add New Reason'}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Reason Type</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  {(['customer', 'driver'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Reason Text *</label>
                <input
                  className="input py-3 rounded-xl border-gray-100 focus:border-red-600"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Schedule conflict"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-900" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 shadow-lg shadow-red-100" onClick={saveReason} disabled={saving}>
                {saving ? 'Saving...' : 'Save Reason'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
