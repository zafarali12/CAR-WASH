'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Car } from 'lucide-react'

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'customer'
  const customRedirect = searchParams.get('redirect')
  const redirectUrl = customRedirect || `/dashboard?role=${role}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
             <Car className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Join CarWash</h1>
          <p className="text-gray-400 font-medium text-sm mt-2">Get started as a <span className="text-blue-600 font-bold uppercase">{role}</span></p>
        </div>
        
        <SignUp
          path="/sign-up"
          routing="path"
          forceRedirectUrl={redirectUrl}
          fallbackRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-2xl border border-gray-100 rounded-[2rem] overflow-hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm font-bold py-3 rounded-xl transition-all',
              footerActionLink: 'text-blue-600 font-bold hover:text-blue-700',
              formFieldInput: 'rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all',
              socialButtonsBlockButton: 'rounded-xl border-gray-100 hover:bg-gray-50 transition-all',
            }
          }}
        />
      </div>
    </div>
  )
}

