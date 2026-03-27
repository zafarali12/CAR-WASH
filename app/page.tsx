'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Car, ShieldCheck, Clock, Zap, Star, LayoutDashboard, Check } from 'lucide-react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [landingServices, setLandingServices] = useState<any[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchLandingServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .limit(3)
      
      if (data) setLandingServices(data)
      setServicesLoaded(true)
    }
    fetchLandingServices()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Car size={18} className="text-white md:size-[22px]" />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight text-gray-900 uppercase">CarWash</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {!isLoaded ? null : isSignedIn ? (
            <div className="flex items-center gap-3 md:gap-6">
              <Link href="/dashboard" className="text-[13px] md:text-sm font-bold flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                <LayoutDashboard size={14} /> <span className="hidden xs:inline">Dashboard</span>
              </Link>
              <SignOutButton>
                <button className="text-[13px] md:text-sm font-bold text-gray-500 hover:text-red-600 px-2 py-1 transition-colors">Sign Out</button>
              </SignOutButton>
            </div>
          ) : (
            <>
              <Link href="/sign-in" className="text-[13px] md:text-sm font-bold text-gray-600 hover:text-blue-600 px-3 py-1.5 transition-colors">Sign In</Link>
              <Link href="/sign-up" className="px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl text-[13px] md:text-sm font-bold hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-200">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-40 pb-16 md:pb-32 px-4 md:px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-100/50 rounded-full blur-[80px] md:blur-[120px] translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-indigo-50/50 rounded-full blur-[80px] md:blur-[120px] -translate-x-1/4 translate-y-1/4" />

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] md:text-xs font-black mb-6 md:mb-10 animate-fade-in uppercase tracking-widest shadow-sm">
            <Zap size={12} className="fill-current" /> Instant Mobile Car Wash
          </div>
          <h1 className="text-3xl sm:text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[1.15] mb-6 md:mb-10 max-w-[95%] mx-auto break-words">
            Premium Car Care <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">At Your Doorstep</span>
          </h1>
          <p className="text-base md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 md:mb-16 font-medium leading-relaxed px-4">
            Professional car wash services delivered to your location. 
            Choose your service, set the time, and we'll take care of the rest.
          </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 sm:px-0">
            {isSignedIn ? (
              <>
                <Link href="/customer/dashboard" className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-gray-900 text-white rounded-2xl text-base md:text-lg font-bold hover:bg-black transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 text-center">
                  Book a Wash Now
                </Link>
                <button
                  onClick={() => {
                    document.cookie = "preferred_role=driver; path=/; max-age=600"
                    window.location.href = "/dashboard?role=driver"
                  }}
                  className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl text-base md:text-lg font-bold hover:border-gray-200 hover:bg-gray-50 transition-all hover:-translate-y-1 active:scale-95 text-center"
                >
                  Drive & Earn
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    document.cookie = "preferred_role=customer; path=/; max-age=600"
                    window.location.href = "/sign-up?role=customer"
                  }}
                  className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-gray-900 text-white rounded-2xl text-base md:text-lg font-bold hover:bg-black transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
                >
                  Book a Wash Now
                </button>
                <button 
                  onClick={() => {
                    document.cookie = "preferred_role=driver; path=/; max-age=600"
                    window.location.href = "/sign-up?role=driver"
                  }}
                  className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl text-base md:text-lg font-bold hover:border-gray-200 hover:bg-gray-50 transition-all hover:-translate-y-1 active:scale-95"
                >
                  Become a Driver
                </button>
              </>
            )}
          </div>

          <div className="mt-16 md:mt-24 flex flex-wrap items-center justify-center gap-6 md:gap-12 grayscale opacity-40 px-6">
            <div className="text-lg md:text-2xl font-black tracking-tighter">TOYOTA</div>
            <div className="text-lg md:text-2xl font-black tracking-tighter">BMW</div>
            <div className="text-lg md:text-2xl font-black tracking-tighter">TESLA</div>
            <div className="text-lg md:text-2xl font-black tracking-tighter">HONDA</div>
            <div className="text-lg md:text-2xl font-black tracking-tighter">AUDI</div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-32 px-4 md:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-20 px-4">
            <h2 className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Core Promise</h2>
            <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Why thousands choose CarWash</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {[
              { 
                icon: ShieldCheck, title: 'Trusted Professionals', 
                desc: 'Every driver is verified and background-checked for your peace of mind.',
                color: 'bg-green-100 text-green-700'
              },
              { 
                icon: Clock, title: 'Schedule Anytime', 
                desc: 'Book for right now or schedule weeks in advance. We work on your timeline.',
                color: 'bg-blue-100 text-blue-700'
              },
              { 
                icon: Star, title: 'Eco-Friendly Tools', 
                desc: 'We use premium, biodegradable cleaning agents that protect your paint and the planet.',
                color: 'bg-amber-100 text-amber-700'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-16 -translate-y-16 -z-0 group-hover:scale-150 transition-transform duration-700 opacity-50" />
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${feature.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg relative z-10`}>
                  <feature.icon size={30} />
                </div>
                <h4 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 relative z-10 tracking-tight">{feature.title}</h4>
                <p className="text-gray-500 leading-relaxed font-bold text-sm md:text-base relative z-10">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories / Services Section */}
      <section id="services" className="py-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Our Menu</h2>
              <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Wash Packages</h3>
              <p className="text-gray-500 mt-4 font-bold text-sm md:text-base max-w-md">Choose a professional package that fits your car's specific needs.</p>
            </div>
            <Link href="/customer/services" className="inline-flex items-center gap-2 text-blue-600 font-black text-sm hover:translate-x-1 transition-all">
              EXPLORE ALL SERVICES <Zap size={16} className="fill-current" />
            </Link>
          </div>

          {!servicesLoaded ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] rounded-[2.5rem] bg-gray-50 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {landingServices.map((pkg, i) => (
                <div 
                  key={pkg.id} 
                  className={`p-10 rounded-[2.5rem] border flex flex-col transition-all hover:-translate-y-2 hover:shadow-2xl ${
                    i === 1 
                      ? 'bg-gray-900 border-gray-800 text-white shadow-2xl scale-105 z-10' 
                      : 'bg-white border-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-2xl font-black mb-1">{pkg.name}</h4>
                      <div className="text-[10px] font-black opacity-50 flex items-center gap-1 uppercase tracking-widest">
                        <Clock size={12}/> {pkg.duration} min
                      </div>
                    </div>
                    <div className="text-3xl font-black text-blue-500">${pkg.price}</div>
                  </div>
                  
                  <p className="text-sm font-bold opacity-60 mb-8 leading-relaxed">
                    {pkg.description || 'Professional car care service using premium biodegradable materials.'}
                  </p>

                  <ul className="space-y-4 mb-10 flex-1">
                    {(pkg.features?.slice(0, 4) || ['Exterior Wash', 'Rim Polish', 'Tire Shine']).map((item: string) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-bold opacity-80">
                        <div className={`p-1 rounded-full ${i === 1 ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                          <Check size={14} className="text-blue-500" strokeWidth={3} />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => {
                      if (!isSignedIn) {
                        document.cookie = `preferred_role=customer; path=/; max-age=600`
                        window.location.href = `/sign-up?redirect=/customer/services?book=${pkg.id}`
                      } else {
                        window.location.href = `/customer/services?book=${pkg.id}`
                      }
                    }}
                    className={`w-full py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg ${
                      i === 1 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/40' 
                        : 'bg-gray-900 text-white hover:bg-black shadow-gray-200'
                    }`}
                  >
                    BOOK NOW
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-6">
          <div className="text-sm text-gray-400 font-medium tracking-tight">
            © 2026 CarWash App. All rights reserved.
          </div>
          <div className="flex gap-10">
            <Link href="/terms" className="text-sm font-bold text-gray-400 hover:text-gray-900">Terms</Link>
            <Link href="/privacy" className="text-sm font-bold text-gray-400 hover:text-gray-900">Privacy</Link>
            <Link href="/support" className="text-sm font-bold text-gray-400 hover:text-gray-900">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

