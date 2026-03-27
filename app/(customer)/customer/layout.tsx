// app/(customer)/customer/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Home, CalendarCheck, Clock, User, Bell } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/customer/dashboard', label: 'Home', icon: Home },
  { href: '/customer/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/customer/history', label: 'History', icon: Clock },
  { href: '/customer/profile', label: 'Profile', icon: User },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">CW</span>
          </div>
          <span className="font-semibold text-gray-900">CarWash</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/customer/notifications" className="relative text-gray-400 hover:text-gray-600">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">2</span>
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors',
                  active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={active ? 'font-medium' : ''}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
