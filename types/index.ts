// ============================================
// CARWASH APP - Complete TypeScript Types
// ============================================

export type UserRole = 'customer' | 'driver' | 'admin' | 'sub_admin'

export type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'driver_on_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type PaymentMethod = 'card' | 'cash' | 'wallet'

export type CouponType = 'percentage' | 'fixed' | 'free_service'

export type NotificationType =
  | 'booking_update'
  | 'promotion'
  | 'reminder'
  | 'system'

export type CancellationReasonType = 'customer' | 'driver' | 'admin'

// ============ USER TYPES ============

export interface User {
  id: string
  clerk_id: string
  email: string
  phone?: string
  role: UserRole
  created_at: string
}

export interface Customer {
  id: string
  user_id: string
  name: string
  profile_photo?: string
  address?: string
  city?: string
  zip_code?: string
  user?: User
  vehicles?: Vehicle[]
  bookings?: Booking[]
}

export interface Driver {
  id: string
  user_id: string
  name: string
  phone: string
  profile_photo?: string
  license_number?: string
  vehicle_info?: string
  is_approved: boolean
  is_available: boolean
  rating: number
  completed_jobs: number
  fcm_token?: string
  user?: User
  bookings?: Booking[]
  reviews?: Review[]
}

export interface SubAdmin {
  id: string
  user_id: string
  permissions: SubAdminPermissions
  created_at: string
  user?: User
}

export interface SubAdminPermissions {
  customers: boolean
  drivers: boolean
  bookings: boolean
  services: boolean
  revenue: boolean
  reports: boolean
  coupons: boolean
  notifications: boolean
  reviews: boolean
  cms: boolean
}

// ============ VEHICLE ============

export interface Vehicle {
  id: string
  customer_id: string
  make: string
  model: string
  year: number
  color: string
  plate_number: string
  customer?: Customer
}

// ============ SERVICE ============

export type ServiceCategory =
  | 'basic_wash'
  | 'premium_wash'
  | 'interior_clean'
  | 'exterior_detail'
  | 'full_detail'
  | 'custom'

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number // in minutes
  category: ServiceCategory
  image_url?: string
  is_active: boolean
  created_at: string
}

// ============ BOOKING ============

export interface Booking {
  id: string
  customer_id: string
  driver_id?: string
  service_id: string
  vehicle_id: string
  status: BookingStatus
  scheduled_date: string
  scheduled_time: string
  location: { lat: number; lng: number }
  address: string
  total_price: number
  coupon_id?: string
  discount_amount?: number
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  notes?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  customer?: Customer
  driver?: Driver
  service?: Service
  vehicle?: Vehicle
  coupon?: Coupon
  payment?: Payment
  review?: Review
}

// ============ PAYMENT ============

export interface Payment {
  id: string
  booking_id: string
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  transaction_id?: string
  stripe_payment_intent?: string
  created_at: string
  booking?: Booking
}

// ============ REVIEW ============

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  driver_id: string
  rating: number // 1-5
  comment?: string
  is_flagged: boolean
  admin_response?: string
  created_at: string
  booking?: Booking
  customer?: Customer
  driver?: Driver
}

// ============ COUPON ============

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  min_order_value?: number
  max_uses?: number
  used_count: number
  per_user_limit?: number
  valid_from: string
  valid_until: string
  is_active: boolean
  created_at: string
}

export interface CouponUsage {
  id: string
  coupon_id: string
  customer_id: string
  booking_id: string
  used_at: string
}

// ============ NOTIFICATIONS ============

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  booking_id?: string
  created_at: string
}

export interface NotificationTemplate {
  id: string
  name: string
  title: string
  message: string
  type: NotificationType
  created_at: string
}

// ============ CANCELLATION ============

export interface CancellationReason {
  id: string
  reason: string
  type: CancellationReasonType
  is_active: boolean
  created_at: string
}

// ============ CMS ============

export type CmsPage =
  | 'about_us'
  | 'terms_conditions'
  | 'privacy_policy'
  | 'faq'
  | 'contact'

export interface CmsContent {
  id: string
  page_name: CmsPage
  content: string
  updated_at: string
}

export interface AppBanner {
  id: string
  title: string
  subtitle?: string
  image_url: string
  link?: string
  is_active: boolean
  order: number
  created_at: string
}

export interface Faq {
  id: string
  question: string
  answer: string
  category?: string
  order: number
  is_active: boolean
}

// ============ DASHBOARD ============

export interface AdminDashboardStats {
  total_revenue: number
  revenue_today: number
  revenue_this_week: number
  revenue_this_month: number
  total_bookings: number
  active_bookings: number
  pending_bookings: number
  completed_bookings_today: number
  total_customers: number
  new_customers_today: number
  total_drivers: number
  active_drivers: number
  revenue_chart: RevenueChartData[]
  booking_status_breakdown: StatusBreakdown[]
  top_services: ServiceStats[]
  top_drivers: DriverStats[]
}

export interface RevenueChartData {
  date: string
  revenue: number
  bookings: number
}

export interface StatusBreakdown {
  status: BookingStatus
  count: number
  percentage: number
}

export interface ServiceStats {
  service_id: string
  service_name: string
  total_bookings: number
  total_revenue: number
}

export interface DriverStats {
  driver_id: string
  driver_name: string
  completed_jobs: number
  total_earnings: number
  average_rating: number
}

export interface DriverDashboardStats {
  earnings_today: number
  earnings_this_week: number
  earnings_this_month: number
  jobs_today: number
  jobs_this_week: number
  jobs_this_month: number
  average_rating: number
  total_reviews: number
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// ============ FILTERS ============

export interface BookingFilters {
  status?: BookingStatus
  date_from?: string
  date_to?: string
  driver_id?: string
  customer_id?: string
  service_id?: string
  payment_status?: PaymentStatus
}

export interface CustomerFilters {
  search?: string
  city?: string
  date_from?: string
  date_to?: string
  is_blocked?: boolean
}

export interface DriverFilters {
  search?: string
  is_approved?: boolean
  is_available?: boolean
  min_rating?: number
}
