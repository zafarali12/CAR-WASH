-- ============================================
-- CARWASH APP - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For location data

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin', 'sub_admin');
CREATE TYPE booking_status AS ENUM (
  'pending', 'assigned', 'driver_on_way', 'arrived',
  'in_progress', 'completed', 'cancelled'
);
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('card', 'cash', 'wallet');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_service');
CREATE TYPE notification_type AS ENUM ('booking_update', 'promotion', 'reminder', 'system');
CREATE TYPE cancellation_reason_type AS ENUM ('customer', 'driver', 'admin');
CREATE TYPE service_category AS ENUM (
  'basic_wash', 'premium_wash', 'interior_clean',
  'exterior_detail', 'full_detail', 'custom'
);
CREATE TYPE cms_page AS ENUM (
  'about_us', 'terms_conditions', 'privacy_policy', 'faq', 'contact'
);

-- ============================================
-- TABLES
-- ============================================

-- Users (synced with Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role user_role DEFAULT 'customer',
  is_blocked BOOLEAN DEFAULT false,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile_photo TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers / Workers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  profile_photo TEXT,
  license_number TEXT,
  license_doc_url TEXT,
  id_doc_url TEXT,
  vehicle_info TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  completed_jobs INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  current_location JSONB, -- {lat, lng}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub Admins
CREATE TABLE sub_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{
    "customers": false,
    "drivers": false,
    "bookings": false,
    "services": false,
    "revenue": false,
    "reports": false,
    "coupons": false,
    "notifications": false,
    "reviews": false,
    "cms": false
  }',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  color TEXT,
  plate_number TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INT NOT NULL, -- minutes
  category service_category DEFAULT 'basic_wash',
  image_url TEXT,
  features TEXT[], -- array of features
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_services UUID[], -- null = all services
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage Tracking
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID REFERENCES coupons(id),
  customer_id UUID REFERENCES customers(id),
  booking_id UUID, -- will reference bookings
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  driver_id UUID REFERENCES drivers(id),
  service_id UUID REFERENCES services(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status booking_status DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  location JSONB NOT NULL, -- {lat, lng}
  address TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  coupon_id UUID REFERENCES coupons(id),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  payment_method payment_method,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by TEXT, -- customer/driver/admin
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for coupon_usage
ALTER TABLE coupon_usage 
  ADD CONSTRAINT fk_coupon_usage_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id TEXT,
  stripe_payment_intent TEXT,
  stripe_charge_id TEXT,
  refund_id TEXT,
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id),
  customer_id UUID REFERENCES customers(id),
  driver_id UUID REFERENCES drivers(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES bookings(id),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cancellation Reasons
CREATE TABLE cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reason TEXT NOT NULL,
  type cancellation_reason_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS Content
CREATE TABLE cms_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_name cms_page UNIQUE NOT NULL,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Banners / Sliders
CREATE TABLE app_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Addresses (for customers)
CREATE TABLE saved_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- home, work, other
  address TEXT NOT NULL,
  location JSONB NOT NULL, -- {lat, lng}
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_reviews_driver ON reviews(driver_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_id = auth.jwt()->>'sub');

-- Customers can view/manage their own data
CREATE POLICY "Customers view own data" ON customers
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')
  );

-- Customers manage own vehicles
CREATE POLICY "Customers manage own vehicles" ON vehicles
  FOR ALL USING (
    customer_id = (SELECT c.id FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.jwt()->>'sub')
  );

-- Customers view own bookings
CREATE POLICY "Customers view own bookings" ON bookings
  FOR SELECT USING (
    customer_id = (SELECT c.id FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.jwt()->>'sub')
  );

-- Drivers view assigned bookings
CREATE POLICY "Drivers view assigned bookings" ON bookings
  FOR SELECT USING (
    driver_id = (SELECT d.id FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE u.clerk_id = auth.jwt()->>'sub')
  );

-- Customers view own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')
  );

-- Public: anyone can view active services
CREATE POLICY "Services are publicly viewable" ON services
  FOR SELECT USING (is_active = true);

-- Public: anyone can view CMS content
CREATE POLICY "CMS content is publicly viewable" ON cms_content
  FOR SELECT USING (true);

CREATE POLICY "FAQs are publicly viewable" ON faqs
  FOR SELECT USING (is_active = true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update driver rating after each review
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET rating = (
    SELECT AVG(rating)::DECIMAL(3,2) FROM reviews
    WHERE driver_id = NEW.driver_id
  ),
  completed_jobs = (
    SELECT COUNT(*) FROM bookings
    WHERE driver_id = NEW.driver_id AND status = 'completed'
  )
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_driver_rating();

-- ============================================
-- SEED DATA
-- ============================================

-- Default Services
INSERT INTO services (name, description, price, duration, category, features, is_active, sort_order) VALUES
  ('Basic Wash', 'Exterior hand wash, rinse, and towel dry', 15.00, 30, 'basic_wash',
   ARRAY['Exterior wash', 'Rinse', 'Towel dry'], true, 1),
  ('Premium Wash', 'Full exterior wash with wax, tire shine, and window cleaning', 30.00, 60, 'premium_wash',
   ARRAY['Exterior wash', 'Wax coating', 'Tire shine', 'Window clean', 'Air freshener'], true, 2),
  ('Interior Clean', 'Full interior vacuum, dashboard wipe, and seat cleaning', 25.00, 45, 'interior_clean',
   ARRAY['Interior vacuum', 'Dashboard wipe', 'Seat cleaning', 'Floor mats', 'Cup holders'], true, 3),
  ('Full Detail', 'Complete interior + exterior detailing with clay bar and polish', 80.00, 180, 'full_detail',
   ARRAY['Everything in Premium', 'Clay bar treatment', 'Paint polish', 'Interior shampoo', 'Leather conditioning'], true, 4),
  ('Exterior Detail', 'Clay bar, machine polish, and ceramic coating', 60.00, 120, 'exterior_detail',
   ARRAY['Clay bar', 'Machine polish', 'Ceramic coating', 'Trim restoration'], true, 5);

-- Default Cancellation Reasons
INSERT INTO cancellation_reasons (reason, type) VALUES
  ('Changed my mind', 'customer'),
  ('Found a better price', 'customer'),
  ('Location is not convenient', 'customer'),
  ('Driver taking too long', 'customer'),
  ('Emergency came up', 'customer'),
  ('Vehicle breakdown', 'driver'),
  ('Traffic / road issue', 'driver'),
  ('Personal emergency', 'driver'),
  ('Customer not responding', 'driver'),
  ('No show - customer', 'admin'),
  ('No show - driver', 'admin'),
  ('Service area unavailable', 'admin');

-- Default CMS Content
INSERT INTO cms_content (page_name, content) VALUES
  ('about_us', '<h1>About Us</h1><p>We are a premium car wash booking service...</p>'),
  ('terms_conditions', '<h1>Terms & Conditions</h1><p>By using our app...</p>'),
  ('privacy_policy', '<h1>Privacy Policy</h1><p>Your privacy is important to us...</p>'),
  ('faq', ''),
  ('contact', '<h1>Contact Us</h1><p>Email: support@carwash.com</p>');

-- Default FAQs
INSERT INTO faqs (question, answer, category, sort_order) VALUES
  ('How do I book a car wash?', 'Download our app, create an account, select a service, choose your location and time, and confirm your booking.', 'Booking', 1),
  ('What payment methods do you accept?', 'We accept credit/debit cards, cash, and app wallet payments.', 'Payment', 2),
  ('Can I cancel a booking?', 'Yes, you can cancel up to 30 minutes before the scheduled time for a full refund.', 'Booking', 3),
  ('How do I become a driver?', 'Register in the driver app, upload your documents, and wait for admin approval.', 'Driver', 4),
  ('Is my car safe during the wash?', 'Yes, all our drivers are verified and trained professionals.', 'Safety', 5);
