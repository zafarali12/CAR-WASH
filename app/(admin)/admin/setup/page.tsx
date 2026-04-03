'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { setUserRole } from '@/lib/actions/roles'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Shield, User, Car, Check, Loader2, Zap } from 'lucide-react'

export default function AdminSetup() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  if (!isLoaded) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin" /></div>
  if (!user) return <div className="text-center py-20 font-medium">Please sign in first</div>

  const handleSetup = async (role: any) => {
    setLoading(true)
    setSuccess('')
    try {
      const res = await setUserRole(user.id, role)
      if (res.success) {
        setSuccess(role)
        toast.success(`Role updated to ${role}!`)
        // Clear session cache and redirect
        setTimeout(() => window.location.href = '/', 1500)
      } else {
        toast.error('Failed: ' + res.error)
      }
    } catch (err) {
      toast.error('Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  const syncDatabasePrices = async () => {
    if (!confirm('This will update all your current services to the new SAR standard pricing. Continue?')) return
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Update one by one to ensure we match existing names
      const updates = [
        { name: 'Basic Wash', price: 40, duration: 30 },
        { name: 'Premium Wash', price: 80, duration: 60 },
        { name: 'Interior Clean', price: 70, duration: 45 },
        { name: 'Full Detail', price: 200, duration: 180 },
        { name: 'Exterior Detail', price: 150, duration: 120 }
      ]

      for (const item of updates) {
        await supabase.from('services')
          .update({ price: item.price, duration: item.duration, is_active: true })
          .ilike('name', item.name) // Use ilike for case-insensitive matching
      }

      toast.success('Database prices updated successfully!')
    } catch (err: any) {
      toast.error('Sync failed: ' + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-green-100">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-display">Success!</h1>
        <p className="text-lg text-gray-500 mb-8 max-w-sm">
          Your role has been updated to <span className="text-primary-600 font-bold uppercase">{success}</span> in the database.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-sm space-y-4">
          <p className="text-sm text-amber-900 leading-relaxed font-medium">
            <span className="font-bold block mb-1">FINAL STEP:</span>
            You MUST sign out and sign back in for the "Admin" role to work. Clerk's session token needs to be refreshed.
          </p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => window.location.href = '/'} // This will trigger Clerk's signout buttons/flow or redirect to home where they can sign out
              className="btn-primary py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
            >
              Go to Home to Sign Out
            </button>
            <button 
              onClick={() => setSuccess('')}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Choose different role
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center max-w-sm space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Developer Setup</h1>
        <p className="text-gray-500 text-sm">
          Use this tool to manually set your role in Clerk metadata & Supabase for testing.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        <button 
          onClick={() => handleSetup('admin')} 
          disabled={loading}
          className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
            success === 'admin' ? 'border-primary-600 bg-primary-50' : 'border-gray-100 hover:border-primary-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${success === 'admin' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600'}`}>
              <Shield size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Administrator</p>
              <p className="text-xs text-gray-500">Full access to admin panel</p>
            </div>
          </div>
          {success === 'admin' && <Check className="text-primary-600" size={20} />}
        </button>

        <button 
          onClick={() => handleSetup('driver')} 
          disabled={loading}
          className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
            success === 'driver' ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-green-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${success === 'driver' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600'}`}>
              <Car size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Driver / Worker</p>
              <p className="text-xs text-gray-500">Access driver app interface</p>
            </div>
          </div>
          {success === 'driver' && <Check className="text-green-600" size={20} />}
        </button>

        <button 
          onClick={() => handleSetup('customer')} 
          disabled={loading}
          className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
            success === 'customer' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-blue-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${success === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
              <User size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Customer</p>
              <p className="text-xs text-gray-500">Default customer dashboard</p>
            </div>
          </div>
          {success === 'customer' && <Check className="text-blue-600" size={20} />}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="animate-spin" size={16} />
          Updating...
        </div>
      )}

      <div className="w-full max-w-sm pt-8 border-t border-gray-100">
        <button 
          onClick={syncDatabasePrices} 
          disabled={loading}
          className="w-full btn-secondary py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-primary-100 bg-primary-50/30 font-bold"
        >
          <Zap size={20} className="text-primary-600 fill-primary-600" />
          Sync Database to SAR Prices
        </button>
        <p className="text-[10px] text-gray-400 mt-3 text-center uppercase tracking-widest font-black opacity-50">
          Reset all services to Basic = 40, Premium = 80, etc.
        </p>
      </div>

      <div className="text-center mt-10">
        <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">Authentication Context</p>
        <p className="text-xs text-gray-400 mt-1 font-mono">{user.primaryEmailAddress?.emailAddress}</p>
      </div>
    </div>
  )
}
