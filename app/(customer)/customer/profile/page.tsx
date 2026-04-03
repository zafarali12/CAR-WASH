// app/(customer)/customer/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Car, MapPin, LogOut, Star } from 'lucide-react'
import toast from 'react-hot-toast'

type ActiveTab = 'profile' | 'vehicles' | 'addresses' | 'reviews'

export default function CustomerProfile() {
  const { user } = useUser()
  const [tab, setTab] = useState<ActiveTab>('profile')
  const [customer, setCustomer] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', color: '', plate_number: '' })
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => { fetchProfile() }, [user])

  async function fetchProfile() {
    if (!user?.id) return
    const userRes = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!userRes.data) return

    const custRes = await supabase.from('customers').select('*').eq('user_id', userRes.data.id).single()
    if (custRes.data) {
      setCustomer(custRes.data)

      const [vRes, aRes, rRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('customer_id', custRes.data.id),
        supabase.from('saved_addresses').select('*').eq('customer_id', custRes.data.id),
        supabase.from('reviews').select('*, bookings(services(name)), drivers(name)').eq('customer_id', custRes.data.id).order('created_at', { ascending: false }),
      ])
      setVehicles(vRes.data || [])
      setAddresses(aRes.data || [])
      setReviews(rRes.data || [])
    }
    setLoading(false)
  }

  async function saveVehicle() {
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.plate_number) {
      toast.error('Fill required fields')
      return
    }
    const payload = { ...vehicleForm, customer_id: customer.id }
    const { error } = editVehicleId
      ? await supabase.from('vehicles').update(payload).eq('id', editVehicleId)
      : await supabase.from('vehicles').insert(payload)
    if (!error) {
      toast.success(editVehicleId ? 'Vehicle updated!' : 'Vehicle added!')
      setShowVehicleModal(false)
      fetchProfile()
    }
  }

  async function deleteVehicle(id: string) {
    if (!confirm('Remove this vehicle?')) return
    await supabase.from('vehicles').delete().eq('id', id)
    setVehicles(v => v.filter(x => x.id !== id))
    toast.success('Vehicle removed')
  }

  const tabs: { key: ActiveTab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: null },
    { key: 'vehicles', label: 'Vehicles', icon: Car },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
    { key: 'reviews', label: 'Reviews', icon: Star },
  ]

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-2xl font-bold">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div>
          <h1 className="text-lg font-semibold">{user?.fullName}</h1>
          <p className="text-sm text-gray-400">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Personal Details</h2>
            {[
              { label: 'Name', value: user?.fullName },
              { label: 'Email', value: user?.primaryEmailAddress?.emailAddress },
              { label: 'Phone', value: user?.primaryPhoneNumber?.phoneNumber || '—' },
              { label: 'City', value: customer?.city || '—' },
            ].map(f => (
              <div key={f.label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-400">{f.label}</span>
                <span className="font-medium">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Stats</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bookings', value: vehicles.length > 0 ? '—' : '0' },
                { label: 'Vehicles', value: vehicles.length },
                { label: 'Reviews', value: reviews.length },
              ].map(s => (
                <div key={s.label} className="text-center py-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <SignOutButton>
            <button className="w-full btn-danger py-3 flex items-center justify-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          </SignOutButton>
        </div>
      )}

      {/* Vehicles Tab */}
      {tab === 'vehicles' && (
        <div className="space-y-3">
          {vehicles.map(v => (
            <div key={v.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">🚗</div>
              <div className="flex-1">
                <p className="font-semibold">{v.make} {v.model}</p>
                <p className="text-sm text-gray-400">{v.color} · {v.plate_number}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditVehicleId(v.id); setVehicleForm({ make: v.make, model: v.model, color: v.color || '', plate_number: v.plate_number }); setShowVehicleModal(true) }} className="text-gray-400 hover:text-gray-600">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => deleteVehicle(v.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          <button className="btn-primary w-full" onClick={() => { setEditVehicleId(null); setVehicleForm({ make: '', model: '', color: '', plate_number: '' }); setShowVehicleModal(true) }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      )}

      {/* Addresses Tab */}
      {tab === 'addresses' && (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="card p-4 flex items-start gap-3">
              <MapPin size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold capitalize">{a.label}</p>
                <p className="text-sm text-gray-400">{a.address}</p>
              </div>
              {a.is_default && <span className="ml-auto badge-active text-xs">Default</span>}
            </div>
          ))}
          {addresses.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No saved addresses</p>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                {r.bookings?.services?.name} · Driver: {r.drivers?.name}
              </p>
              {r.comment && <p className="text-sm text-gray-700">"{r.comment}"</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No reviews yet</p>}
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={e => e.target === e.currentTarget && setShowVehicleModal(false)}>
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-3">
            <h2 className="font-semibold">{editVehicleId ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Make *</label><input className="input" value={vehicleForm.make} onChange={e => setVehicleForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" /></div>
              <div><label className="label">Model *</label><input className="input" value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} placeholder="Corolla" /></div>
              <div className="col-span-2"><label className="label">Color</label><input className="input" value={vehicleForm.color} onChange={e => setVehicleForm(f => ({ ...f, color: e.target.value }))} placeholder="White" /></div>
            </div>
            <div><label className="label">Plate Number *</label><input className="input" value={vehicleForm.plate_number} onChange={e => setVehicleForm(f => ({ ...f, plate_number: e.target.value }))} placeholder="ABC-1234" /></div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowVehicleModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveVehicle}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
