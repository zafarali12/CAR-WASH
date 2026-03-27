// lib/store.ts
import { create } from 'zustand'

interface AppStore {
  // Customer state
  activeBookingId: string | null
  setActiveBookingId: (id: string | null) => void
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void

  // Driver state
  isOnline: boolean
  setIsOnline: (online: boolean) => void
  pendingJobId: string | null
  setPendingJobId: (id: string | null) => void

  // Admin state
  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string | null) => void
  selectedDriverId: string | null
  setSelectedDriverId: (id: string | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  // Customer
  activeBookingId: null,
  setActiveBookingId: (id) => set({ activeBookingId: id }),
  unreadNotifications: 0,
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),

  // Driver
  isOnline: false,
  setIsOnline: (online) => set({ isOnline: online }),
  pendingJobId: null,
  setPendingJobId: (id) => set({ pendingJobId: id }),

  // Admin
  selectedCustomerId: null,
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  selectedDriverId: null,
  setSelectedDriverId: (id) => set({ selectedDriverId: id }),
}))
