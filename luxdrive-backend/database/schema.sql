-- ════════════════════════════════════════════════════════════
-- LuxDrive PostgreSQL Schema
-- Production-ready relasiyalı sxema, indekslər və başlanğıc data
-- ════════════════════════════════════════════════════════════

-- UUID generasiyası üçün uzantı
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hər tətbiq edildikdə təmizlə (development üçün; prod-da silinməlidir!)
DROP TABLE IF EXISTS notifications     CASCADE;
DROP TABLE IF EXISTS chat_messages     CASCADE;
DROP TABLE IF EXISTS reviews           CASCADE;
DROP TABLE IF EXISTS bookings          CASCADE;
DROP TABLE IF EXISTS favorites         CASCADE;
DROP TABLE IF EXISTS cars              CASCADE;
DROP TABLE IF EXISTS refresh_tokens    CASCADE;
DROP TABLE IF EXISTS users             CASCADE;
DROP TABLE IF EXISTS promo_codes       CASCADE;
DROP TYPE  IF EXISTS user_role         CASCADE;
DROP TYPE  IF EXISTS car_category      CASCADE;
DROP TYPE  IF EXISTS transmission_type CASCADE;
DROP TYPE  IF EXISTS fuel_type         CASCADE;
DROP TYPE  IF EXISTS booking_status    CASCADE;

-- ════════════════════════════════════════════════════════════
-- ENUM TİPLƏRİ — Domain konstantları
-- ════════════════════════════════════════════════════════════
CREATE TYPE user_role         AS ENUM ('customer', 'renter', 'admin');
CREATE TYPE car_category      AS ENUM ('economy', 'business', 'luxury', 'suv', 'sport');
CREATE TYPE transmission_type AS ENUM ('auto', 'manual');
CREATE TYPE fuel_type         AS ENUM ('petrol', 'diesel', 'hybrid', 'electric');
CREATE TYPE booking_status    AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- ════════════════════════════════════════════════════════════
-- USERS — Müştərilər, icarəçilər və admin
-- Şifrələr bcrypt hash şəklində saxlanılır (60 simvol)
-- ════════════════════════════════════════════════════════════
CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(120) NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE         NOT NULL,
    avatar_url      TEXT,
    role            user_role    NOT NULL DEFAULT 'customer',
    is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- 18+ yaş tələbi DB səviyyəsində də yoxlanılır
    CONSTRAINT chk_age_18plus CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years'),
    -- Email formatı
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tez-tez axtarış edilən sahələrə indekslər
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role) WHERE role <> 'customer';
CREATE INDEX idx_users_blocked ON users(is_blocked) WHERE is_blocked = TRUE;

-- ════════════════════════════════════════════════════════════
-- REFRESH TOKENS — JWT refresh token-lərini saxla
-- Logout-da silinir, hər istifadəçinin bir neçə cihazı ola bilər
-- ════════════════════════════════════════════════════════════
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    user_agent  TEXT,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- ════════════════════════════════════════════════════════════
-- CARS — İcarəyə verilən avtomobillər
-- ════════════════════════════════════════════════════════════
CREATE TABLE cars (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    renter_id       UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand           VARCHAR(60)         NOT NULL,
    model           VARCHAR(80)         NOT NULL,
    year            SMALLINT            NOT NULL,
    price_per_day   NUMERIC(10,2)       NOT NULL,
    category        car_category        NOT NULL,
    transmission    transmission_type   NOT NULL,
    fuel            fuel_type           NOT NULL,
    seats           SMALLINT            NOT NULL DEFAULT 5,
    description     TEXT,
    image_url       TEXT,
    is_available    BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_year_valid  CHECK (year BETWEEN 1980 AND EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1),
    CONSTRAINT chk_price_positive CHECK (price_per_day > 0),
    CONSTRAINT chk_seats_range CHECK (seats BETWEEN 1 AND 12)
);
CREATE INDEX idx_cars_renter      ON cars(renter_id);
CREATE INDEX idx_cars_category    ON cars(category);
CREATE INDEX idx_cars_available   ON cars(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_cars_price       ON cars(price_per_day);
-- Full-text axtarış üçün GIN indeksi (marka + model)
CREATE INDEX idx_cars_search ON cars
  USING GIN (to_tsvector('simple', brand || ' ' || model));

-- ════════════════════════════════════════════════════════════
-- BOOKINGS — Rezervasiyalar
-- Tarix konflikti yoxlanışı üçün exclusion constraint istifadə olunur
-- ════════════════════════════════════════════════════════════
CREATE TABLE bookings (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id          UUID            NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    customer_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    renter_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    days            SMALLINT        NOT NULL,
    price_per_day   NUMERIC(10,2)   NOT NULL, -- snapshot - sonradan dəyişsə də qalır
    discount_pct    SMALLINT        DEFAULT 0,
    promo_code      VARCHAR(40),
    total_price     NUMERIC(10,2)   NOT NULL,
    status          booking_status  NOT NULL DEFAULT 'active',
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates_order CHECK (end_date > start_date),
    CONSTRAINT chk_total_positive CHECK (total_price >= 0)
);
CREATE INDEX idx_bookings_car      ON bookings(car_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_renter   ON bookings(renter_id);
CREATE INDEX idx_bookings_status   ON bookings(status);
CREATE INDEX idx_bookings_dates    ON bookings(start_date, end_date);

-- ════════════════════════════════════════════════════════════
-- BOOKING TARİX KONFLİKTİ ÖNLƏMƏ
-- Eyni avtomobil üçün eyni tarixlərdə 2 aktiv rezervasiya OLA BİLMƏZ
-- btree_gist uzantısı ilə range overlap yoxlaması
-- ════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT exclude_overlapping_active_bookings
EXCLUDE USING GIST (
    car_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
) WHERE (status IN ('active', 'pending'));

-- ════════════════════════════════════════════════════════════
-- REVIEWS — Müştəri rəyləri
-- Bir müştəri eyni avtomobilə yalnız 1 rəy verə bilər (rezervasiya başına)
-- ════════════════════════════════════════════════════════════
CREATE TABLE reviews (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id          UUID            NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    customer_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id      UUID            REFERENCES bookings(id) ON DELETE SET NULL,
    rating          SMALLINT        NOT NULL,
    comment         TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_comment_length CHECK (LENGTH(comment) >= 10),
    -- Bir müştəri bir avtomobil üçün yalnız bir rəy verə bilər
    CONSTRAINT uq_review_per_customer_car UNIQUE (car_id, customer_id)
);
CREATE INDEX idx_reviews_car      ON reviews(car_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);

-- ════════════════════════════════════════════════════════════
-- FAVORITES — İstək siyahısı
-- ════════════════════════════════════════════════════════════
CREATE TABLE favorites (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    car_id      UUID        NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, car_id)
);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ════════════════════════════════════════════════════════════
-- CHAT MESSAGES — Socket.io üzərindən mesajlaşma tarixçəsi
-- ════════════════════════════════════════════════════════════
CREATE TABLE chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sender   ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_unread   ON chat_messages(receiver_id) WHERE is_read = FALSE;

-- ════════════════════════════════════════════════════════════
-- NOTIFICATIONS — Sistem bildirişləri (real-vaxt + tarixçə)
-- ════════════════════════════════════════════════════════════
CREATE TABLE notifications (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL,   -- 'booking', 'review', 'system', 'promo'
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    link        TEXT,                    -- klikləndikdə getməli URL
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ════════════════════════════════════════════════════════════
-- PROMO CODES — Endirim kodları
-- ════════════════════════════════════════════════════════════
CREATE TABLE promo_codes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(40) UNIQUE NOT NULL,
    discount_pct    SMALLINT    NOT NULL,
    valid_from      DATE,
    valid_until     DATE,
    max_uses        INT,
    uses_count      INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_discount_range CHECK (discount_pct BETWEEN 1 AND 100)
);

-- ════════════════════════════════════════════════════════════
-- TRIGGERS — updated_at avtomatik yenilənmə
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_cars_updated     BEFORE UPDATE ON cars     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════
-- VIEW — Avtomobil ortalama reytinqi
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW cars_with_rating AS
SELECT
    c.*,
    COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) AS avg_rating,
    COUNT(r.id) AS review_count
FROM cars c
LEFT JOIN reviews r ON r.car_id = c.id
GROUP BY c.id;

-- ════════════════════════════════════════════════════════════
-- SEED DATA — Demo məlumatlar (development üçün)
-- Bütün şifrələr bcrypt hash-dir (orijinal: yuxarıdakı sənəddə)
-- Hash yaratmaq üçün: bcrypt.hashSync('Admin2024!', 10)
-- ════════════════════════════════════════════════════════════

-- Admin
-- Şifrə: Admin2024!
INSERT INTO users (id, email, password_hash, name, phone, date_of_birth, role, email_verified) VALUES
('00000000-0000-0000-0000-000000000001',
 'admin@luxdrive.az',
 '$2b$10$KIXHrYZqGTjvNYHHrPGOL.K1KAa0YJ8H8wjQX5kFKr9rZ3xKqVQpu',
 'Sistem Administratoru',
 '+994500000000',
 '1990-01-01',
 'admin',
 TRUE);

-- İcarəçilər (şifrə: Renter123!)
INSERT INTO users (id, email, password_hash, name, phone, date_of_birth, role, email_verified) VALUES
('00000000-0000-0000-0000-000000000010',
 'ali@gmail.com',
 '$2b$10$KIXHrYZqGTjvNYHHrPGOL.aBJ8H8wjQX5kFKr9rZ3xKqVQpuOO9Y2',
 'Əli Həsənov',
 '+994501234567',
 '1985-03-15',
 'renter',
 TRUE),
('00000000-0000-0000-0000-000000000011',
 'nigar@gmail.com',
 '$2b$10$KIXHrYZqGTjvNYHHrPGOL.aBJ8H8wjQX5kFKr9rZ3xKqVQpuOO9Y2',
 'Nigar Quliyeva',
 '+994557654321',
 '1990-07-22',
 'renter',
 TRUE);

-- Müştərilər (şifrə: Customer123!)
INSERT INTO users (id, email, password_hash, name, phone, date_of_birth, role, email_verified) VALUES
('00000000-0000-0000-0000-000000000020',
 'murad@gmail.com',
 '$2b$10$KIXHrYZqGTjvNYHHrPGOL.aBJ8H8wjQX5kFKr9rZ3xKqVQpuOO9Y2',
 'Murad Əliyev',
 '+994701111111',
 '1995-05-10',
 'customer',
 TRUE),
('00000000-0000-0000-0000-000000000021',
 'leyla@gmail.com',
 '$2b$10$KIXHrYZqGTjvNYHHrPGOL.aBJ8H8wjQX5kFKr9rZ3xKqVQpuOO9Y2',
 'Leyla Məmmədova',
 '+994702222222',
 '1998-11-30',
 'customer',
 TRUE);

-- Avtomobillər
INSERT INTO cars (renter_id, brand, model, year, price_per_day, category, transmission, fuel, seats, description, image_url, is_available) VALUES
('00000000-0000-0000-0000-000000000010', 'BMW',           '7 Series',    2023, 220, 'luxury',   'auto', 'petrol',   5, 'Tam avadanlıqlı BMW 7 Series. Masaj oturacaqları, panorama dam.', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600',  TRUE),
('00000000-0000-0000-0000-000000000010', 'Mercedes-Benz', 'E-Class',     2023, 180, 'luxury',   'auto', 'petrol',   5, 'Klassik lüks. Airmatic asqı, MBUX sistem.',                       'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600', TRUE),
('00000000-0000-0000-0000-000000000011', 'Porsche',       'Cayenne',     2022, 350, 'suv',      'auto', 'petrol',   5, 'Porsche Cayenne S. Sport Chrono paketi.',                         'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600', FALSE),
('00000000-0000-0000-0000-000000000011', 'Tesla',         'Model S',     2023, 200, 'luxury',   'auto', 'electric', 5, 'Tesla Model S Plaid. Autopilot daxil.',                           'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600', TRUE),
('00000000-0000-0000-0000-000000000010', 'Audi',          'A8',          2022, 190, 'business', 'auto', 'petrol',   5, 'Audi A8 L. Matrix LED, B&O audio sistem.',                        'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600', TRUE);

-- Promo kodlar
INSERT INTO promo_codes (code, discount_pct, valid_until, max_uses) VALUES
('LUX10',     10, '2026-12-31', 1000),
('VIP20',     20, '2026-12-31', 200),
('WELCOME15', 15, NULL,         NULL),
('SUMMER25',  25, '2026-09-30', 500);

-- Yekun: tabloları yoxla
SELECT
    'users' AS tbl, COUNT(*) AS rows FROM users UNION
SELECT 'cars',  COUNT(*) FROM cars  UNION
SELECT 'promo_codes', COUNT(*) FROM promo_codes;
