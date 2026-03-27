'use client'

import Link from 'next/link'
import { Clock, ShieldCheck, Mail, LogOut, Car } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'

export default function DriverPendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-fade-in">
        
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Car size={22} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-900 uppercase">CarWash</span>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
          
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Clock size={36} className="text-blue-600" />
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Pending Approval</h1>
          
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">
            Your driver application has been received! Our team is currently reviewing your documents. 
            This usually takes <span className="text-gray-900 font-bold">24-48 hours</span>.
          </p>

          <div className="space-y-4 mb-10 text-left">
            {[
              { icon: ShieldCheck, text: 'Background Check in progress' },
              { icon: Mail, text: 'Check your email for status updates' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <item.icon size={18} className="text-blue-600" />
                <span className="text-sm font-bold text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
             <SignOutButton>
                <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
                  <LogOut size={18} /> Sign Out
                </button>
             </SignOutButton>
             
             <Link href="/support" className="text-sm font-bold text-blue-600 hover:underline">
               Need help? Contact Support
             </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
          © 2026 CarWash Logistics Team
        </p>
      </div>
    </div>
  )
}
