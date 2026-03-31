// app/(customer)/customer/services/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { Clock, Check, ChevronRight, MapPin, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateCouponAction, incrementCouponUsageAction } from './actions'

type Step = 'service' | 'vehicle' | 'location' | 'datetime' | 'confirm'

const SERVICE_ICONS: Record<string, string> = {
  basic_wash: '🚿', premium_wash: '✨', interior_clean: '🪟',
  exterior_detail: '🔆', full_detail: '💎', custom: '⚙️',
}

export default function CustomerServices() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()

  const [step, setStep] = useState<Step>('service')
  const [services, setServices] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [cancellationReasons, setCancellationReasons] = useState<any[]>([])

  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [customerId, setCustomerId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  // Add Vehicle State
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', year: '', color: '', plate_number: '' })
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [user])

  async function fetchData() {
    if (!user?.id) return

    setLoading(true)
    const [svcRes] = await Promise.all([
      supabase.from('services').select('*').eq('is_active', true).order('sort_order'),
    ])
    setServices(svcRes.data || [])

    // 1. Check if user and customer profile exist
    const { data: userRow } = await supabase.from('users').select('id').eq('clerk_id', user.id).maybeSingle()
    let currentCustomerId = ''

    if (userRow) {
      const { data: custRow } = await supabase.from('customers').select('id').eq('user_id', userRow.id).maybeSingle()
      if (custRow) currentCustomerId = custRow.id
    }

    // 2. Profile or Customer missing? Automatically Sync & Create (bypasses RLS)
    if (!currentCustomerId) {
      try {
        const res = await fetch('/api/user/sync', {
          method: 'POST',
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName,
            profilePhoto: user.imageUrl
          })
        })
        const result = await res.json()
        if (result.success) currentCustomerId = result.customerId
      } catch (err) {
        console.error('Auto-sync failed:', err)
      }
    }

    if (currentCustomerId) {
      setCustomerId(currentCustomerId)
      const [vehRes, addrRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('customer_id', currentCustomerId),
        supabase.from('saved_addresses').select('*').eq('customer_id', currentCustomerId),
      ])
      setVehicles(vehRes.data || [])
      setSavedAddresses(addrRes.data || [])
    }

    // Pre-select service if coming from home
    const bookId = searchParams.get('book')
    if (bookId && svcRes.data) {
      const svc = svcRes.data.find((s: any) => s.id === bookId)
      if (svc) setSelectedService(svc)
    }
    setLoading(false)
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    
    const result = await validateCouponAction(couponCode)

    if (result.error || !result.data) {
      toast.error(result.error || 'Invalid or expired coupon')
      setCouponLoading(false)
      return
    }
    const data = result.data
    if (data.max_uses && data.used_count >= data.max_uses) {
      toast.error('Coupon usage limit reached')
      setCouponLoading(false)
      return
    }
    if (selectedService && data.min_order_value > selectedService.price) {
      toast.error(`Minimum order value is $${data.min_order_value}`)
      setCouponLoading(false)
      return
    }
    setAppliedCoupon(data)
    toast.success('Coupon applied!')
    setCouponLoading(false)
  }

  function calculateDiscount() {
    if (!appliedCoupon || !selectedService) return 0
    if (appliedCoupon.type === 'percentage') return (selectedService.price * appliedCoupon.value) / 100
    if (appliedCoupon.type === 'fixed') return Math.min(appliedCoupon.value, selectedService.price)
    if (appliedCoupon.type === 'free_service') return selectedService.price
    return 0
  }

  const discount = calculateDiscount()
  const finalPrice = selectedService ? Math.max(0, selectedService.price - discount) : 0

  const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ]

  const minDate = new Date().toISOString().split('T')[0]

  async function submitBooking() {
    if (!customerId || !selectedService || !selectedVehicle || !selectedAddress || !selectedDate || !selectedTime) {
      toast.error('Please complete all fields')
      return
    }

    if (couponCode.trim() && !appliedCoupon) {
      toast.error('Please click "Apply" to use your entered coupon first.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          service_id: selectedService.id,
          vehicle_id: selectedVehicle.id,
          address: selectedAddress,
          location: { lat: 0, lng: 0 },
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          total_price: selectedService.price,
          coupon_id: appliedCoupon?.id || null,
          discount_amount: discount,
          final_price: finalPrice,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      if (appliedCoupon?.id) {
        await incrementCouponUsageAction(appliedCoupon.id)
      }

      toast.success('Booking confirmed!')
      router.push(`/customer/bookings/${data.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveVehicle() {
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.plate_number) {
      toast.error('Please fill all required fields')
      return
    }
    setVehicleSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          ...vehicleForm,
          year: parseInt(vehicleForm.year) || null,
          customer_id: customerId
        })
        .select()
        .single()

      if (error) throw error
      
      setVehicles([...vehicles, data])
      setSelectedVehicle(data)
      setShowAddVehicle(false)
      setStep('location')
      toast.success('Vehicle added successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add vehicle')
    } finally {
      setVehicleSubmitting(false)
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'service', label: 'Service' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'location', label: 'Location' },
    { key: 'datetime', label: 'Date & Time' },
    { key: 'confirm', label: 'Confirm' },
  ]
  const stepIdx = steps.findIndex(s => s.key === step)

  return (
    <div>
      {/* Step Progress */}
      <div className="flex items-center justify-between mb-8 px-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-sm ${
                i < stepIdx ? 'bg-primary-600 text-white shadow-primary-100'
                : i === stepIdx ? 'bg-white border-2 border-primary-600 text-primary-600 shadow-lg'
                : 'bg-white border border-gray-100 text-gray-300'
              }`}>
                {i < stepIdx ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span className={`hidden sm:block text-[10px] md:text-xs mt-2 font-bold uppercase tracking-tighter ${i === stepIdx ? 'text-primary-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 md:mx-4 rounded-full transition-all duration-500 ${i < stepIdx ? 'bg-primary-600' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step: Select Service */}
      {step === 'service' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Choose a Service</h2>
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedService(s); setStep('vehicle') }}
              className={`w-full card p-4 text-left flex items-center gap-4 hover:border-primary-200 transition-all ${
                selectedService?.id === s.id ? 'border-primary-400 bg-primary-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0">
                {SERVICE_ICONS[s.category] || '🚗'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <p className="text-xs text-gray-400 truncate">{s.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {s.duration} min</span>
                  {s.features?.slice(0, 2).map((f: string) => (
                    <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{f}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-primary-600">${s.price}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Select Vehicle */}
      {step === 'vehicle' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Select Vehicle</h2>
            {vehicles.length > 0 && (
              <button 
                onClick={() => setShowAddVehicle(!showAddVehicle)}
                className="text-primary-600 text-sm font-medium"
              >
                {showAddVehicle ? 'Cancel' : '+ Add New'}
              </button>
            )}
          </div>

          {(vehicles.length === 0 || showAddVehicle) ? (
            <div className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Make *</label>
                  <input className="input" placeholder="Toyota" value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} />
                </div>
                <div>
                  <label className="label">Model *</label>
                  <input className="input" placeholder="Corolla" value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input className="input" type="number" placeholder="2022" value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: e.target.value})} />
                </div>
                <div>
                  <label className="label">Color</label>
                  <input className="input" placeholder="White" value={vehicleForm.color} onChange={e => setVehicleForm({...vehicleForm, color: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Plate Number *</label>
                <input className="input" placeholder="ABC-1234" value={vehicleForm.plate_number} onChange={e => setVehicleForm({...vehicleForm, plate_number: e.target.value})} />
              </div>
              <button 
                className="btn-primary w-full py-3" 
                onClick={saveVehicle}
                disabled={vehicleSubmitting}
              >
                {vehicleSubmitting ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVehicle(v); setStep('location') }}
                  className={`w-full card p-4 text-left flex items-center gap-4 hover:border-primary-200 transition-all ${
                    selectedVehicle?.id === v.id ? 'border-primary-400 bg-primary-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">🚗</div>
                  <div>
                    <p className="font-semibold">{v.make} {v.model}</p>
                    <p className="text-sm text-gray-400">{v.color} · {v.plate_number}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button className="btn-secondary w-full mt-4" onClick={() => setStep('service')}>← Back</button>
        </div>
      )}

      {/* Step: Location */}
      {step === 'location' && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Service Location</h2>
          {savedAddresses.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Saved Addresses</p>
              {savedAddresses.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAddress(a.address); setStep('datetime') }}
                  className={`w-full card p-3 text-left flex items-center gap-3 hover:border-primary-200 ${
                    selectedAddress === a.address ? 'border-primary-400 bg-primary-50' : ''
                  }`}
                >
                  <MapPin size={18} className="text-primary-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium capitalize">{a.label}</p>
                    <p className="text-xs text-gray-400">{a.address}</p>
                  </div>
                  {a.is_default && <Check size={14} className="ml-auto text-primary-500" />}
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Or Enter Address</p>
            <textarea
              className="input"
              rows={3}
              placeholder="Enter your address..."
              value={selectedAddress}
              onChange={e => setSelectedAddress(e.target.value)}
            />
            <button
              className="btn-primary w-full mt-3"
              onClick={() => selectedAddress ? setStep('datetime') : toast.error('Please enter an address')}
            >
              Continue
            </button>
          </div>
          <button className="btn-secondary w-full mt-2" onClick={() => setStep('vehicle')}>← Back</button>
        </div>
      )}

      {/* Step: Date & Time */}
      {step === 'datetime' && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Select Date & Time</h2>
          <div className="mb-4">
            <label className="label">Date</label>
            <input type="date" className="input" min={minDate} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          {selectedDate && (
            <div>
              <label className="label">Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTime(t); setStep('confirm') }}
                    className={`py-2 px-3 rounded-xl text-sm border transition-all ${
                      selectedTime === t
                        ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-primary-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn-secondary w-full mt-4" onClick={() => setStep('location')}>← Back</button>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && selectedService && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Confirm Booking</h2>

          {/* Summary Card */}
          <div className="card p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">
                {SERVICE_ICONS[selectedService.category]}
              </div>
              <div>
                <p className="font-semibold">{selectedService.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{selectedService.duration} min</p>
              </div>
            </div>
            {[
              { icon: '🚗', label: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.plate_number})` : '' },
              { icon: '📍', label: selectedAddress },
              { icon: '📅', label: `${selectedDate} at ${selectedTime}` },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{item.icon}</span>
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mb-4">
            {appliedCoupon ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                <Tag size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">{appliedCoupon.code} applied!</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }} className="ml-auto text-green-400 hover:text-green-600">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                />
                <button type="button" className="btn-secondary px-4" onClick={applyCoupon} disabled={couponLoading}>
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold mb-3">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Service price</span><span>${selectedService.price}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({appliedCoupon.code})</span><span>-${discount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-100">
                <span>Total</span><span className="text-primary-600">${finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full text-base py-3" onClick={submitBooking} disabled={submitting}>
            {submitting ? 'Placing Booking...' : 'Confirm Booking →'}
          </button>
          <button className="btn-secondary w-full mt-2" onClick={() => setStep('datetime')}>← Back</button>
        </div>
      )}
    </div>
  )
}
