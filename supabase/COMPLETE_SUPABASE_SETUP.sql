-- ============================================================
-- FRAMES OF DIVINE (GOD STORE) — COMPLETE SUPABASE DATABASE SETUP
-- Paste this entire script into your Supabase SQL Editor and click "Run"
-- ============================================================

-- 1. PRODUCTS TABLE (Artworks & Devotional Prints)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    brand TEXT NOT NULL DEFAULT 'Frames of Divine',
    price NUMERIC NOT NULL CHECK (price >= 0),
    original_price NUMERIC,
    category TEXT NOT NULL CHECK (category IN ('Deity Paintings', 'Temple Paintings', 'Sculpture Paintings', 'Premium Sets')),
    images JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    stock INTEGER DEFAULT 10,
    colors JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    is_new BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products (is_new);
CREATE INDEX IF NOT EXISTS idx_products_is_trending ON public.products (is_trending);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for extra columns if table already exists
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- 3. BRANDS / DEITIES & THEMES TABLE
CREATE TABLE IF NOT EXISTS public.brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_name TEXT,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for extra columns if table already exists
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands (slug);

-- 4. DISCOUNT COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    original_price NUMERIC NOT NULL CHECK (original_price > 0),
    desired_price NUMERIC NOT NULL CHECK (desired_price >= 0 AND desired_price <= original_price),
    discount_amount NUMERIC NOT NULL CHECK (discount_amount >= 0),
    discount_percentage NUMERIC NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    min_purchase_amount NUMERIC DEFAULT 0,
    scope TEXT NOT NULL DEFAULT 'order' CHECK (scope IN ('order', 'product')),
    target_product_id TEXT,
    usage_limit INTEGER,
    usage_limit_per_customer INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.discount_coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.discount_coupons (is_active);

-- 5. COUPON USAGES TABLE
CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES public.discount_coupons(id) ON DELETE SET NULL,
    coupon_code TEXT NOT NULL,
    order_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    original_amount NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL,
    final_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_code ON public.coupon_usages (coupon_code);

-- 6. CUSTOMER REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.customer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    city TEXT,
    designation TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    image_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_verified_buyer BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_published ON public.customer_reviews (is_published, display_order);

-- 7. ORDERS TABLE (Includes Razorpay & WhatsApp alert tracking)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    total_amount NUMERIC NOT NULL,
    subtotal NUMERIC,
    discount_amount NUMERIC DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'razorpay',
    fulfillment_status TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    items JSONB,
    shipping_address JSONB,
    whatsapp_notification_sent BOOLEAN DEFAULT false,
    whatsapp_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for extra columns if table already exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_notification_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON public.orders (razorpay_payment_id);

-- 8. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_order_id TEXT NOT NULL,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL CHECK (status IN ('authorized', 'captured', 'failed', 'refunded', 'partially_refunded')),
    payment_method TEXT,
    captured_at TIMESTAMPTZ,
    error_code TEXT,
    error_description TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_order ON public.payment_records (internal_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_rzp_order ON public.payment_records (razorpay_order_id);

-- 9. WEBHOOK DEDUPLICATION TABLE
CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
    signature_verified BOOLEAN NOT NULL DEFAULT true,
    payload JSONB,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.razorpay_webhook_events (event_id);

-- 10. SITE SETTINGS & ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. CUSTOM DEVOTIONAL ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.custom_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    deity_artwork TEXT,
    dimensions TEXT,
    framing_preference TEXT,
    reference_image_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.custom_enquiries (status);

-- ============================================================
-- SEED INITIAL DATA (CATEGORIES & DEITIES/BRANDS)
-- ============================================================

INSERT INTO public.categories (id, slug, name, description, display_order)
VALUES
    ('cat-deity-prints', 'deity-prints', 'Deity Paintings', 'Premium framed and unframed Hindu deity Tanjore paintings', 1),
    ('cat-temple-prints', 'temple-prints', 'Temple Paintings', 'Sacred temple gopuram, corridor, and architecture artwork', 2),
    ('cat-sculpture-prints', 'sculpture-prints', 'Sculpture Paintings', 'Yali pillars, bronze icons, and sacred carving studies', 3),
    ('cat-premium-sets', 'premium-sets', 'Premium Sets', 'Curated devotional photo sets for pooja rooms and gifting', 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

INSERT INTO public.brands (id, name, slug, category_name, description)
VALUES
    ('b-shiva-nataraja', 'Lord Shiva Nataraja', 'lord-shiva-nataraja', 'Deity Paintings', 'The cosmic dancer of time, rhythm, and renewal'),
    ('b-murugan', 'Lord Murugan', 'lord-murugan', 'Deity Paintings', 'Radiant divine deity of wisdom, courage, and the sacred Vel'),
    ('b-ganesha', 'Lord Ganesha', 'lord-ganesha', 'Deity Paintings', 'Remover of obstacles and lord of auspicious beginnings'),
    ('b-meenakshi', 'Goddess Meenakshi', 'goddess-meenakshi', 'Deity Paintings', 'Divine queen and mother deity of Madurai'),
    ('b-venkateswara', 'Lord Venkateswara', 'lord-venkateswara', 'Deity Paintings', 'Supreme protector and radiant manifestation of Vishnu'),
    ('b-mahalakshmi', 'Goddess Mahalakshmi', 'goddess-mahalakshmi', 'Deity Paintings', 'Goddess of wealth, grace, light, and prosperity'),
    ('b-dakshinamurthy', 'Lord Dakshinamurthy', 'lord-dakshinamurthy', 'Deity Paintings', 'Silent teacher of cosmic knowledge under the banyan tree'),
    ('b-bhairava', 'Bhairava', 'bhairava', 'Deity Paintings', 'Fierce protector of temples, cosmic time, and sacred space'),
    ('b-brihadisvara', 'Thanjavur Brihadisvara', 'thanjavur-brihadisvara', 'Temple Paintings', 'Great Living Chola temple architecture & Vimana majesty'),
    ('b-madurai-meenakshi', 'Madurai Meenakshi Amman', 'madurai-meenakshi-amman', 'Temple Paintings', 'Celebrated thousand-pillared halls and soaring gopurams'),
    ('b-rameswaram', 'Rameswaram Ramanathaswamy', 'rameswaram-ramanathaswamy', 'Temple Paintings', 'Historic long sculpted corridors of sacred coastal sanctuary'),
    ('b-chidambaram', 'Chidambaram Nataraja', 'chidambaram-nataraja', 'Temple Paintings', 'The golden roof shrine of cosmic akasha and divine dance'),
    ('b-chola-bronzes', 'Chola Bronzes', 'chola-bronzes', 'Sculpture Paintings', 'Lost-wax cast bronze icons with divine fluidity and elegance'),
    ('b-yali-pillars', 'Yali Stone Pillars', 'yali-stone-pillars', 'Sculpture Paintings', 'Mythical guardian lions carved from massive monolithic granite'),
    ('b-sacred-reliefs', 'Sacred Reliefs', 'sacred-reliefs', 'Sculpture Paintings', 'Intricate granite reliefs of celestial dancers and sacred lore'),
    ('b-pooja-sanctum-set', 'Pooja Room Sanctum Set', 'pooja-room-sanctum-set', 'Premium Sets', 'Complete five-piece framed devotional gallery for pooja rooms'),
    ('b-dravidian-heritage', 'Dravidian Heritage Series', 'dravidian-heritage-series', 'Premium Sets', 'Curated fine art archival collection of sacred temple corridors'),
    ('b-festival-gifting', 'Festival & Gifting Edits', 'festival-gifting-edits', 'Premium Sets', 'Gold-accented devotional paintings suited for housewarmings and gifts')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_name = EXCLUDED.category_name,
    description = EXCLUDED.description;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_enquiries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Public read policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read products') THEN
        CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read categories') THEN
        CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read brands') THEN
        CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active coupons') THEN
        CREATE POLICY "Public read active coupons" ON public.discount_coupons FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read published reviews') THEN
        CREATE POLICY "Public read published reviews" ON public.customer_reviews FOR SELECT USING (is_published = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read site settings') THEN
        CREATE POLICY "Public read site settings" ON public.site_settings FOR SELECT USING (true);
    END IF;

    -- Public insert policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert reviews') THEN
        CREATE POLICY "Public insert reviews" ON public.customer_reviews FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert enquiries') THEN
        CREATE POLICY "Public insert enquiries" ON public.custom_enquiries FOR INSERT WITH CHECK (true);
    END IF;

    -- Full Service Role Access Policies (for Admin & Webhooks)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access products') THEN
        CREATE POLICY "Service role full access products" ON public.products 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access categories') THEN
        CREATE POLICY "Service role full access categories" ON public.categories 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access brands') THEN
        CREATE POLICY "Service role full access brands" ON public.brands 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access orders') THEN
        CREATE POLICY "Service role full access orders" ON public.orders 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access payments') THEN
        CREATE POLICY "Service role full access payments" ON public.payment_records 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access webhooks') THEN
        CREATE POLICY "Service role full access webhooks" ON public.razorpay_webhook_events 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access coupons') THEN
        CREATE POLICY "Service role full access coupons" ON public.discount_coupons 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access usages') THEN
        CREATE POLICY "Service role full access usages" ON public.coupon_usages 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access reviews') THEN
        CREATE POLICY "Service role full access reviews" ON public.customer_reviews 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access settings') THEN
        CREATE POLICY "Service role full access settings" ON public.site_settings 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access enquiries') THEN
        CREATE POLICY "Service role full access enquiries" ON public.custom_enquiries 
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
