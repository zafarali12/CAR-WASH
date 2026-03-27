// app/(admin)/admin/layout.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard, Users, Car, CalendarCheck, DollarSign,
  FileBarChart, Tag, Bell, Star, FileText, Settings,
  ChevronLeft, ChevronRight, Menu, X, Wrench,
  MessageSquare, ShieldCheck, XCircle
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/drivers', label: 'Drivers', icon: Car },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/cms', label: 'CMS', icon: FileText },
  { href: '/admin/cancellation-reasons', label: 'Cancel Reasons', icon: XCircle },
  { href: '/admin/sub-admins', label: 'Sub-Admins', icon: ShieldCheck },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={clsx(
      'flex flex-col h-full bg-white border-r border-gray-100',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Car size={16} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-semibold text-gray-900">CarWash</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5',
                active
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          {(!collapsed || mobile) && (
            <div>
              <p className="text-xs font-medium text-gray-700">Admin</p>
              <p className="text-xs text-gray-400">admin@carwash.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            className="lg:hidden text-gray-500"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900">
              {navItems.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
