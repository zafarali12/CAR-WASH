# 🚗 CarWash Booking App — Full Stack

A complete car wash booking platform with three interfaces:
- **Customer App** — Book, track, and review car wash services
- **Driver App** — Accept jobs, navigate, and track earnings
- **Admin Panel** — Manage everything from one dashboard

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Database | Supabase (PostgreSQL) |
| Authentication | Clerk |
| Styling | Tailwind CSS |
| State | React hooks + Zustand |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Charts | Recharts |
| Payments | Stripe |
| Notifications | FCM (Firebase) |

---

## 📁 Project Structure

```
carwash-app/
├── app/
│   ├── auth/
│   │   ├── sign-in/          # Clerk sign-in
│   │   └── sign-up/          # Clerk sign-up
│   ├── (admin)/admin/
│   │   ├── layout.tsx         # Admin sidebar layout
│   │   ├── dashboard/         # Stats + charts
│   │   ├── bookings/          # All bookings
│   │   ├── customers/         # Customer management
│   │   ├── drivers/           # Driver approval + management
│   │   ├── services/          # Service CRUD
│   │   ├── revenue/           # Revenue analytics
│   │   ├── reports/           # Exportable reports
│   │   ├── coupons/           # Coupon management
│   │   ├── notifications/     # Push notifications
│   │   ├── reviews/           # Review moderation
│   │   ├── cms/               # Content management
│   │   └── sub-admins/        # Sub-admin management
│   ├── (customer)/customer/
│   │   ├── layout.tsx         # Mobile bottom nav
│   │   ├── dashboard/         # Home + active booking
│   │   ├── services/          # Multi-step booking flow
│   │   ├── bookings/          # Booking history
│   │   └── profile/           # Profile + vehicles
│   ├── (driver)/driver/
│   │   ├── layout.tsx         # Driver bottom nav
│   │   ├── dashboard/         # Jobs + requests
│   │   ├── jobs/              # Job history
│   │   ├── earnings/          # Earnings + charts
│   │   └── profile/           # Driver profile
│   ├── api/
│   │   ├── webhooks/clerk/    # Clerk → Supabase sync
│   │   └── bookings/          # Booking API
│   ├── layout.tsx             # Root layout (Clerk)
│   └── page.tsx               # Role-based redirect
├── lib/
│   ├── supabase/
│   │   ├── schema.sql          # Full DB schema + seed
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client + admin
│   └── clerk/                  # Clerk helpers
├── types/
│   └── index.ts               # All TypeScript types
├── components/                # Shared components
├── middleware.ts              # Route protection
└── .env.example               # Environment variables
```

---

## 🚀 Setup Instructions

### Step 1: Clone & Install

```bash
git clone <your-repo>
cd carwash-app
npm install
```

### Step 2: Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`

### Step 3: Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the entire `lib/supabase/schema.sql` file
4. This creates all tables, RLS policies, triggers, and seed data

### Step 4: Clerk Setup

1. Create app at [clerk.com](https://clerk.com)
2. Enable Email, Google, and Apple sign-in
3. Add custom metadata field `role` to user schema
4. Set up webhook pointing to `https://yourapp.com/api/webhooks/clerk`
5. Subscribe to: `user.created`, `user.updated`, `user.deleted`

### Step 5: Clerk Roles Configuration

In Clerk Dashboard → Sessions → Customize session token:
```json
{
  "metadata": "{{user.public_metadata}}"
}
```

To set user roles (use Clerk Admin SDK or Dashboard):
```javascript
// Set role when creating user
await clerkClient.users.updateUser(userId, {
  publicMetadata: { role: 'customer' } // or 'driver', 'admin'
})
```

### Step 6: Run Development Server

```bash
npm run dev
```

Visit:
- Customer: http://localhost:3000/customer/dashboard
- Driver: http://localhost:3000/driver/dashboard
- Admin: http://localhost:3000/admin/dashboard

---

## 🔑 Features by Role

### Customer
- [x] Book car wash (5-step flow: service → vehicle → location → datetime → confirm)
- [x] Apply coupon codes
- [x] Real-time booking tracking
- [x] View driver info + call driver
- [x] Manage vehicles
- [x] Booking history
- [x] Leave reviews
- [x] Profile management

### Driver
- [x] Go online/offline toggle
- [x] Receive booking requests
- [x] Accept/reject bookings
- [x] Update job status (on way → arrived → started → completed)
- [x] Navigate to customer
- [x] Today's schedule
- [x] Earnings dashboard with charts

### Admin
- [x] Dashboard with revenue charts
- [x] Customer management (view, block)
- [x] Driver management (approve, block)
- [x] Booking management (filter, assign driver)
- [x] Service CRUD
- [x] Revenue analytics by period/service/driver
- [x] Coupon management
- [x] Push notifications
- [x] Review moderation
- [x] CMS (About, Terms, Privacy, FAQ)

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Synced from Clerk, base user data |
| `customers` | Customer profiles |
| `drivers` | Driver profiles + approval status |
| `sub_admins` | Sub-admin permissions |
| `vehicles` | Customer vehicles |
| `services` | Car wash service catalog |
| `bookings` | All bookings (core table) |
| `payments` | Payment records |
| `reviews` | Customer reviews |
| `coupons` | Promo codes |
| `coupon_usage` | Coupon usage tracking |
| `notifications` | In-app notifications |
| `cancellation_reasons` | Predefined cancellation reasons |
| `cms_content` | CMS pages |
| `app_banners` | Home screen banners |
| `faqs` | FAQ entries |
| `saved_addresses` | Customer saved locations |

---

## 🌐 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/clerk` | POST | Sync Clerk users to Supabase |
| `/api/bookings` | GET | List bookings (role-aware) |
| `/api/bookings` | POST | Create new booking |

---

## 🔒 Security

- Row Level Security on all Supabase tables
- Route protection via Clerk middleware
- Role-based access control (customer/driver/admin/sub_admin)
- Service role key only used server-side

---

## 📱 Mobile-First Design

The customer and driver apps are optimized for mobile:
- Sticky headers + bottom navigation
- Touch-friendly tap targets
- Safe area insets for iOS
- Responsive grids

Admin panel is desktop-optimized with collapsible sidebar.

---

## 🔧 Upcoming / TODO

- [ ] Stripe payment integration
- [ ] Firebase push notifications
- [ ] Google Maps real-time tracking
- [ ] Booking reports PDF export
- [ ] Driver document upload
- [ ] In-app chat (customer ↔ driver)
- [ ] Wallet system
- [ ] Sub-admin permissions enforcement

---

## 📦 Deploy to Vercel

```bash
vercel --prod
```

Add all env vars in Vercel Dashboard → Settings → Environment Variables.
