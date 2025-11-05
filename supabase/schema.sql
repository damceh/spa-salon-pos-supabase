-- Spa & Salon POS Management System - Database Schema
-- This file creates all necessary tables, relationships, functions, and RLS policies

-- =============================================
-- EXTENSIONS & CONFIGURATION
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM TYPES
-- =============================================

-- User role enumeration
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'manager',
    'receptionist',
    'therapist'
);

-- Appointment status enumeration
CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

-- Payment status enumeration
CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'refunded',
    'partially_refunded'
);

-- Payment method enumeration
CREATE TYPE payment_method AS ENUM (
    'cash',
    'card',
    'mobile_payment',
    'bank_transfer',
    'other'
);

-- Webhook event enumeration
CREATE TYPE webhook_event AS ENUM (
    'appointment.created',
    'appointment.updated',
    'appointment.completed',
    'appointment.cancelled',
    'payment.created',
    'payment.completed',
    'customer.created',
    'customer.updated'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table for staff authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'receptionist',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapists table extending users for therapist-specific information
CREATE TABLE therapists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE NOT NULL,
    specialties TEXT[], -- Array of specialties
    certifications JSONB, -- Store certification details
    hire_date DATE,
    hourly_rate DECIMAL(10,2),
    commission_rate DECIMAL(5,2), -- Percentage commission
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1', -- For UI color coding
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN DEFAULT true,
    requires_therapist BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table (retail items)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    cost_price DECIMAL(10,2) CHECK (cost_price >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    therapist_id UUID REFERENCES therapists(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    total_price DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure no overlapping appointments for the same therapist
    EXCLUDE (therapist_id WITH =, tsrange(start_time, end_time) WITH &&) USING (therapist_id, tsrange(start_time, end_time))
);

-- Transaction header table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status payment_status DEFAULT 'pending',
    payment_method payment_method,
    payment_reference TEXT, -- Transaction ID from payment gateway
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction line items table
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapist availability/schedule
CREATE TABLE therapist_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure no overlapping schedules for the same therapist
    EXCLUDE (therapist_id WITH =, day_of_week WITH =, tsrange(start_time, end_time) WITH &&)
    USING (therapist_id, day_of_week, tsrange(start_time, end_time))
);

-- Time off/leave requests
CREATE TABLE therapist_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    start_time TIME,
    end_time TIME,
    reason TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE webhook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT, -- For HMAC signature verification
    events webhook_event[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhook_configurations(id) ON DELETE CASCADE,
    event_type webhook_event NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, success, failed
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Therapists indexes
CREATE INDEX idx_therapists_user_id ON therapists(user_id);
CREATE INDEX idx_therapists_available ON therapists(is_available);

-- Services indexes
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active);

-- Appointments indexes
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX idx_appointments_service ON appointments(service_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_therapist_time ON appointments(therapist_id, start_time);

-- Transactions indexes
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX idx_transactions_staff ON transactions(staff_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Products indexes
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_stock_low ON products(stock_quantity) WHERE stock_quantity <= reorder_level;

-- Schedules indexes
CREATE INDEX idx_therapist_schedules_therapist ON therapist_schedules(therapist_id);
CREATE INDEX idx_therapist_schedules_day ON therapist_schedules(day_of_week);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Managers and above can view all users" ON users
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('manager', 'super_admin')
    );

CREATE POLICY "Super admins can insert users" ON users
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Super admins can update users" ON users
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'super_admin'
    );

-- Therapists policies
CREATE POLICY "All staff can view active therapists" ON therapists
    FOR SELECT USING (is_active = true);

CREATE POLICY "Managers and above can manage therapists" ON therapists
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('manager', 'super_admin')
    );

-- Services policies
CREATE POLICY "All staff can view active services" ON services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Managers and above can manage services" ON services
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('manager', 'super_admin')
    );

-- Products policies
CREATE POLICY "All staff can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Managers and above can manage products" ON products
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('manager', 'super_admin')
    );

-- Customers policies
CREATE POLICY "All staff can view customers" ON customers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Receptionists and above can manage customers" ON customers
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('receptionist', 'manager', 'super_admin')
    );

-- Appointments policies
CREATE POLICY "Therapists can view their own appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM therapists t
            WHERE t.user_id = auth.uid() AND t.id = therapist_id
        )
    );

CREATE POLICY "All staff can view all appointments" ON appointments
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('receptionist', 'manager', 'super_admin')
    );

CREATE POLICY "Receptionists and above can manage appointments" ON appointments
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('receptionist', 'manager', 'super_admin')
    );

-- Transactions policies
CREATE POLICY "Staff can view transactions they created" ON transactions
    FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Managers and above can view all transactions" ON transactions
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('manager', 'super_admin')
    );

CREATE POLICY "Receptionists and above can manage transactions" ON transactions
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('receptionist', 'manager', 'super_admin')
    );

-- =============================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON therapists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_therapist_schedules_updated_at BEFORE UPDATE ON therapist_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_therapist_time_off_updated_at BEFORE UPDATE ON therapist_time_off FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_configurations_updated_at BEFORE UPDATE ON webhook_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate appointment end time based on service duration
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.service_id IS NOT NULL THEN
        SELECT duration_minutes INTO NEW.end_time
        FROM services
        WHERE id = NEW.service_id;

        IF NEW.end_time IS NOT NULL THEN
            NEW.end_time = NEW.start_time + (NEW.end_time || ' minutes')::INTERVAL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate end time
CREATE TRIGGER calculate_appointment_end_time_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION calculate_appointment_end_time();

-- Function to validate appointment doesn't overlap with therapist time off
CREATE OR REPLACE FUNCTION validate_appointment_vs_time_off()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM therapist_time_off
        WHERE therapist_id = NEW.therapist_id
        AND start_date <= DATE(NEW.start_time)
        AND end_date >= DATE(NEW.start_time)
        AND is_approved = true
        AND (
            (start_time IS NULL AND end_time IS NULL) OR -- Full day off
            (start_time IS NOT NULL AND end_time IS NOT NULL AND
             TIME(NEW.start_time) < end_time AND
             TIME(NEW.start_time) + (NEW.end_time - NEW.start_time) > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Therapist is not available during this time due to approved time off';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to validate against time off
CREATE TRIGGER validate_appointment_vs_time_off_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_vs_time_off();

-- Function to update product stock when transaction items are created
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_id IS NOT NULL THEN
        UPDATE products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update stock on transaction item creation
CREATE TRIGGER update_product_stock_trigger
    AFTER INSERT ON transaction_items
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Function to calculate daily revenue
CREATE OR REPLACE FUNCTION calculate_daily_revenue(target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    daily_revenue DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO daily_revenue
    FROM transactions
    WHERE DATE(created_at) = target_date
    AND status = 'paid';

    RETURN daily_revenue;
END;
$$ LANGUAGE plpgsql;

-- Function to get therapist performance metrics
CREATE OR REPLACE FUNCTION get_therapist_performance(
    therapist_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_appointments BIGINT,
    completed_appointments BIGINT,
    total_revenue DECIMAL(10,2),
    average_rating DECIMAL(3,2),
    completion_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COALESCE(SUM(t.total_amount), 0) as total_revenue,
        0.0 as average_rating, -- Placeholder for future rating system
        CASE
            WHEN COUNT(a.id) > 0 THEN
                ROUND((COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 100.0 / COUNT(a.id)), 2)
            ELSE 0
        END as completion_rate
    FROM appointments a
    LEFT JOIN transactions t ON a.id = t.appointment_id AND t.status = 'paid'
    WHERE a.therapist_id = therapist_id_param
    AND DATE(a.start_time) BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get service popularity
CREATE OR REPLACE FUNCTION get_service_popularity(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    service_id UUID,
    service_name TEXT,
    booking_count BIGINT,
    total_revenue DECIMAL(10,2),
    average_booking_value DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as service_id,
        s.name as service_name,
        COUNT(a.id) as booking_count,
        COALESCE(SUM(t.total_amount), 0) as total_revenue,
        CASE
            WHEN COUNT(a.id) > 0 THEN
                COALESCE(SUM(t.total_amount), 0) / COUNT(a.id)
            ELSE 0
        END as average_booking_value
    FROM services s
    LEFT JOIN appointments a ON s.id = a.service_id
    LEFT JOIN transactions t ON a.id = t.appointment_id AND t.status = 'paid'
    WHERE DATE(a.start_time) BETWEEN start_date AND end_date
    OR a.id IS NULL -- Include services with no bookings
    GROUP BY s.id, s.name
    ORDER BY booking_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for therapist details with user info
CREATE VIEW therapist_details AS
SELECT
    t.*,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.role,
    u.is_active as user_active
FROM therapists t
JOIN users u ON t.user_id = u.id;

-- View for appointment details with related info
CREATE VIEW appointment_details AS
SELECT
    a.*,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    td.first_name || ' ' || td.last_name as therapist_name,
    s.name as service_name,
    s.duration_minutes,
    s.base_price
FROM appointments a
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN therapist_details td ON a.therapist_id = td.id
LEFT JOIN services s ON a.service_id = s.id;

-- View for transaction details
CREATE VIEW transaction_details AS
SELECT
    t.*,
    c.first_name || ' ' || c.last_name as customer_name,
    u.first_name || ' ' || u.last_name as staff_name,
    u.role as staff_role
FROM transactions t
LEFT JOIN customers c ON t.customer_id = c.id
LEFT JOIN users u ON t.staff_id = u.id;

-- =============================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- =============================================

-- Add realtime publication for critical tables
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER TABLE therapist_schedules REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE therapist_time_off REPLICA IDENTITY FULL;

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert default service categories
INSERT INTO service_categories (name, description, color, sort_order) VALUES
('Massage', 'Various massage therapy services', '#10b981', 1),
('Skincare', 'Facial treatments and skincare services', '#8b5cf6', 2),
('Hair', 'Hair cutting, styling, and treatments', '#f59e0b', 3),
('Nail', 'Manicure and pedicure services', '#ec4899', 4),
('Body', 'Body treatments and wellness services', '#06b6d4', 5);

-- Insert default services (you can customize these)
INSERT INTO services (category_id, name, description, duration_minutes, base_price) VALUES
((SELECT id FROM service_categories WHERE name = 'Massage'), 'Swedish Massage', 'Relaxing full-body massage', 60, 80.00),
((SELECT id FROM service_categories WHERE name = 'Massage'), 'Deep Tissue Massage', 'Therapeutic deep tissue massage', 90, 120.00),
((SELECT id FROM service_categories WHERE name = 'Skincare'), 'Classic Facial', 'Basic facial treatment', 60, 90.00),
((SELECT id FROM service_categories WHERE name = 'Hair'), 'Haircut & Style', 'Professional haircut and styling', 45, 60.00),
((SELECT id FROM service_categories WHERE name = 'Nail'), 'Manicure', 'Classic manicure service', 30, 35.00),
((SELECT id FROM service_categories WHERE name = 'Nail'), 'Pedicure', 'Classic pedicure service', 45, 50.00);

-- Insert sample products
INSERT INTO products (name, description, sku, unit_price, cost_price, stock_quantity) VALUES
('Massage Oil - Lavender', 'Calming lavender massage oil', 'MOO-001', 25.00, 12.50, 50),
('Facial Cleanser', 'Gentle daily facial cleanser', 'FC-002', 35.00, 17.50, 30),
('Hair Shampoo - Professional', 'Salon-quality shampoo', 'HS-003', 40.00, 20.00, 25),
('Nail Polish Red', 'Classic red nail polish', 'NP-004', 15.00, 7.50, 100);

-- =============================================
-- COMMENTS ON SCHEMA
-- =============================================

COMMENT ON TABLE users IS 'System users including all staff roles';
COMMENT ON TABLE therapists IS 'Therapist-specific profiles extending base users';
COMMENT ON TABLE service_categories IS 'Categories for organizing services';
COMMENT ON TABLE services IS 'Services offered by the spa/salon';
COMMENT ON TABLE products IS 'Retail products sold at the spa/salon';
COMMENT ON TABLE customers IS 'Customer information and booking history';
COMMENT ON TABLE appointments IS 'Appointment bookings with time slots and assignments';
COMMENT ON TABLE transactions IS 'Sales transactions and payment records';
COMMENT ON TABLE transaction_items IS 'Individual line items within transactions';
COMMENT ON TABLE therapist_schedules IS 'Regular weekly availability schedules for therapists';
COMMENT ON TABLE therapist_time_off IS 'Time off requests and approved leave';
COMMENT ON TABLE webhook_configurations IS 'Webhook endpoints for third-party integrations';
COMMENT ON TABLE webhook_delivery_logs IS 'Logs of webhook delivery attempts and responses';

-- =============================================
-- SECURITY NOTES
-- =============================================

-- This schema includes:
-- 1. Row Level Security (RLS) for role-based access control
-- 2. Exclusion constraints to prevent overlapping appointments and schedules
-- 3. Check constraints for data validation
-- 4. Triggers for automated calculations and stock management
-- 5. Functions for common business operations
-- 6. Views for simplified reporting
-- 7. Real-time publication for critical tables

-- Remember to:
-- 1. Set up proper Supabase Auth configuration
-- 2. Create custom JWT claims for role-based access
-- 3. Configure appropriate API keys and secrets
-- 4. Set up backup and retention policies
-- 5. Monitor and log access to sensitive data