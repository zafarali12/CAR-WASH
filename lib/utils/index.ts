// lib/utils/index.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateDiscount(price: number, coupon: { type: string; value: number }): number {
  if (coupon.type === 'percentage') return (price * coupon.value) / 100
  if (coupon.type === 'fixed') return Math.min(coupon.value, price)
  if (coupon.type === 'free_service') return price
  return 0
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    assigned: 'badge-assigned',
    driver_on_way: 'badge-assigned',
    arrived: 'badge-assigned',
    in_progress: 'badge-active',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    paid: 'badge-active',
    failed: 'badge-cancelled',
    refunded: 'badge-pending',
  }
  return map[status] || 'badge'
}

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateBookingId(): string {
  return 'BK' + Date.now().toString(36).toUpperCase()
}

export const SERVICE_ICONS: Record<string, string> = {
  basic_wash: '🚿',
  premium_wash: '✨',
  interior_clean: '🪟',
  exterior_detail: '🔆',
  full_detail: '💎',
  custom: '⚙️',
}

export const BOOKING_STATUSES = [
  'pending', 'assigned', 'driver_on_way',
  'arrived', 'in_progress', 'completed', 'cancelled',
] as const

export function isActiveBooking(status: string): boolean {
  return ['pending', 'assigned', 'driver_on_way', 'arrived', 'in_progress'].includes(status)
}
