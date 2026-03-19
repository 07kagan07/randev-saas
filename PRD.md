# SaaS Randevu Uygulaması — PRD (Product Requirements Document)

> **Versiyon:** 1.0.0
> **Teknoloji Stack:** NestJS · PostgreSQL · Redis · React PWA · REST API
> **Yapılma Sırası:** Altyapı → Backend Core → API Katmanları → Frontend → Entegrasyonlar → Deploy

---

## PROJE GENEL BAKIŞ

Berber, kuaför, nail art, araç bakım ve araç yıkama gibi randevu tabanlı işletmeler için çok kiracılı (multi-tenant) SaaS randevu platformu.

**Temel Prensipler:**
- Misafir (kayıtsız) müşteri akışı — maksimum 3 adım
- Mobil-first, "stupid user" prensibi (min 16px font, 48x48px dokunma hedefi)
- Her ekranda tek ana aksiyon
- SMS + WhatsApp + Push bildirim desteği
- Türkçe + İngilizce i18n

---

## FAZA GENEL BAKIŞ

| Faz | Kapsam | Öncelik |
|-----|--------|---------|
| **Faz 1** | Proje altyapısı & DevOps | Kritik |
| **Faz 2** | Veritabanı şeması & migrasyonlar | Kritik |
| **Faz 3** | Auth modülü (OTP + JWT) | Kritik |
| **Faz 4** | İşletme yönetimi API | Kritik |
| **Faz 5** | Personel & Hizmet yönetimi API | Kritik |
| **Faz 6** | Takvim & Müsaitlik API | Kritik |
| **Faz 7** | Randevu akışı API | Kritik |
| **Faz 8** | Bildirim sistemi | Yüksek |
| **Faz 9** | Raporlama API | Orta |
| **Faz 10** | Super Admin API | Orta |
| **Faz 11** | Frontend — Genel altyapı | Kritik |
| **Faz 12** | Frontend — Public vitrin & randevu alma | Kritik |
| **Faz 13** | Frontend — Admin paneli | Yüksek |
| **Faz 14** | Frontend — Personel paneli | Yüksek |
| **Faz 15** | Frontend — Super Admin paneli | Orta |
| **Faz 16** | Görsel yükleme & CDN | Orta |
| **Faz 17** | PWA & Push Notification | Orta |
| **Faz 18** | Test & QA | Yüksek |
| **Faz 19** | Production deploy | Kritik |

---

## FAZ 1 — PROJE ALTYAPISI & DEVOPS

### 1.1 Proje Klasör Yapısı Oluşturma

```
/
├── backend/           (NestJS API)
├── frontend/          (React + Vite PWA)
├── nginx/             (Reverse proxy config)
├── docker-compose.yml
├── .env.example
└── PRD.md
```

### 1.2 Docker Compose Kurulumu

**Yapılacaklar:**
- [ ] `docker-compose.yml` oluştur — 5 servis tanımla
  - `db`: PostgreSQL 16 Alpine — port 5432, healthcheck ile
  - `redis`: Redis 7 Alpine — port 6379, healthcheck ile
  - `backend`: NestJS — port 3000, db ve redis'e depends_on
  - `frontend`: React+Nginx — port 80, backend'e depends_on
  - `nginx`: Reverse proxy — port 80/443
- [ ] Volume tanımları: `postgres_data`, `redis_data`, `uploads_data`
- [ ] Network tanımı: `randevu_net` (bridge)
- [ ] `backend/Dockerfile` — multi-stage build (node:20-alpine builder + runner)
- [ ] `frontend/Dockerfile` — multi-stage build (node:20-alpine builder + nginx:alpine runner)
- [ ] `nginx/nginx.conf` — reverse proxy kuralları:
  - `/api/` → backend:3000
  - `/` → frontend:80
  - `/uploads/` → static dosya servisi (30d cache)

### 1.3 .env.example

```env
APP_URL=https://platform.com
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@db:5432/randevu_db
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ILETIMERKEZI_API_KEY=fd5ca5fa0c505560e56caec82ba38306
ILETIMERKEZI_SENDER=KAGANCOSKUN
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
UPLOAD_DRIVER=local
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_BASE_URL=https://platform.com/uploads
```

### 1.4 NestJS Proje İskeleti

**Yapılacaklar:**
- [ ] `nest new backend` — TypeScript, strict mode
- [ ] Bağımlılıkları ekle:
  - `@nestjs/typeorm`, `typeorm`, `pg` — ORM ve PostgreSQL
  - `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` — JWT auth
  - `@nestjs/bull`, `bull` — Queue yönetimi
  - `ioredis` — Redis client
  - `class-validator`, `class-transformer` — DTO validasyonu
  - `luxon` — Timezone / DST yönetimi
  - `sharp` — Görsel optimizasyon (WEBP dönüşümü)
  - `qrcode` — QR kod üretimi
  - `uuid` — UUID üretimi
  - `@nestjs/throttler` — Rate limiting
  - `helmet` — HTTP güvenlik başlıkları
  - `compression` — Gzip sıkıştırma

### 1.5 React Proje İskeleti

**Yapılacaklar:**
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Bağımlılıkları ekle:
  - `react-router-dom` v6 — Routing
  - `zustand` — State yönetimi
  - `@tanstack/react-query` — Server state & cache
  - `axios` — HTTP client
  - `tailwindcss`, `@tailwindcss/forms` — UI
  - `react-hook-form`, `zod`, `@hookform/resolvers` — Form yönetimi
  - `i18next`, `react-i18next` — i18n
  - `vite-plugin-pwa` — PWA desteği
  - `date-fns`, `date-fns-tz` — Tarih formatı
  - `recharts` — Grafik/raporlama

---

## FAZ 2 — VERİTABANI ŞEMASI & MİGRASYONLAR

### 2.1 TypeORM / Prisma Konfigürasyonu

**Yapılacaklar:**
- [ ] `backend/src/config/database.config.ts` — DatabaseModule konfigürasyonu
- [ ] Migration klasörü yapısı: `backend/src/migrations/`
- [ ] `ormconfig.ts` veya `schema.prisma` (tercih edilen: TypeORM)

### 2.2 Entity Tanımları

Her entity için TypeORM `@Entity()` sınıfları:

**`businesses` tablosu:**
- [ ] `id` UUID PK (gen_random_uuid)
- [ ] `name` VARCHAR(255) NOT NULL
- [ ] `slug` VARCHAR(100) UNIQUE NOT NULL
- [ ] `description` TEXT
- [ ] `phone` VARCHAR(20)
- [ ] `address` TEXT
- [ ] `category` VARCHAR(50) — enum: barber | hair_salon | nail_art | car_service | car_wash | beauty_center | spa | other
- [ ] `logo_url` TEXT
- [ ] `cover_url` TEXT
- [ ] `is_active` BOOLEAN DEFAULT true
- [ ] `subscription_plan` VARCHAR(20) DEFAULT 'free' — enum: free | pro | business
- [ ] `subscription_ends_at` TIMESTAMPTZ
- [ ] `timezone` VARCHAR(60) NOT NULL DEFAULT 'Europe/Istanbul'
- [ ] `approval_mode` VARCHAR(20) DEFAULT 'auto_approve' — enum: auto_approve | manual_approve
- [ ] `created_at`, `updated_at` TIMESTAMPTZ

**`users` tablosu:**
- [ ] `id` UUID PK
- [ ] `business_id` UUID FK → businesses(id) ON DELETE CASCADE (nullable — super_admin için null)
- [ ] `full_name` VARCHAR(255)
- [ ] `phone` VARCHAR(20) UNIQUE NOT NULL
- [ ] `role` VARCHAR(20) NOT NULL — enum: super_admin | business_admin | staff
- [ ] `is_active` BOOLEAN DEFAULT true
- [ ] `avatar_url` TEXT
- [ ] `created_at`, `updated_at` TIMESTAMPTZ

**`services` tablosu:**
- [ ] `id` UUID PK
- [ ] `business_id` UUID FK → businesses(id) ON DELETE CASCADE
- [ ] `name` VARCHAR(255) NOT NULL
- [ ] `category` VARCHAR(100)
- [ ] `duration_minutes` INTEGER NOT NULL
- [ ] `price` DECIMAL(10,2)
- [ ] `currency` VARCHAR(3) DEFAULT 'TRY'
- [ ] `show_price` BOOLEAN DEFAULT true
- [ ] `is_active` BOOLEAN DEFAULT true
- [ ] `created_at` TIMESTAMPTZ

**`staff_services` tablosu (M2M):**
- [ ] `staff_id` UUID FK → users(id) ON DELETE CASCADE
- [ ] `service_id` UUID FK → services(id) ON DELETE CASCADE
- [ ] PK (staff_id, service_id)

**`working_hours` tablosu:**
- [ ] `id` UUID PK
- [ ] `staff_id` UUID FK → users(id) ON DELETE CASCADE
- [ ] `day_of_week` SMALLINT NOT NULL — 0=Pzt ... 6=Paz
- [ ] `is_open` BOOLEAN NOT NULL DEFAULT true
- [ ] `start_time` TIME (nullable)
- [ ] `end_time` TIME (nullable)
- [ ] UNIQUE (staff_id, day_of_week)

**`blocked_periods` tablosu:**
- [ ] `id` UUID PK
- [ ] `staff_id` UUID FK → users(id) ON DELETE CASCADE
- [ ] `business_id` UUID FK → businesses(id)
- [ ] `start_at` TIMESTAMPTZ NOT NULL (UTC olarak saklanır)
- [ ] `end_at` TIMESTAMPTZ NOT NULL (UTC olarak saklanır)
- [ ] `reason` TEXT
- [ ] `created_by` UUID FK → users(id)
- [ ] `created_at` TIMESTAMPTZ

**`appointments` tablosu:**
- [ ] `id` UUID PK
- [ ] `business_id` UUID FK → businesses(id)
- [ ] `staff_id` UUID FK → users(id)
- [ ] `service_id` UUID FK → services(id)
- [ ] `customer_name` VARCHAR(255) NOT NULL
- [ ] `customer_phone` VARCHAR(20) NOT NULL
- [ ] `start_at` TIMESTAMPTZ NOT NULL (UTC)
- [ ] `end_at` TIMESTAMPTZ NOT NULL (UTC)
- [ ] `status` VARCHAR(20) DEFAULT 'pending' — enum: pending | approved | rejected | cancelled | rescheduled | completed | no_show
- [ ] `rejection_reason` TEXT
- [ ] `action_token` UUID UNIQUE
- [ ] `action_token_used` BOOLEAN DEFAULT false
- [ ] `action_token_expires_at` TIMESTAMPTZ
- [ ] `notes` TEXT
- [ ] `created_at`, `updated_at` TIMESTAMPTZ

**`notification_settings` tablosu:**
- [ ] `id` UUID PK
- [ ] `business_id` UUID FK → businesses(id) UNIQUE
- [ ] `reminder_minutes` INTEGER DEFAULT 60 — seçenekler: 60 | 120 | 180 | 1440 | 2880
- [ ] `sms_enabled` BOOLEAN DEFAULT true
- [ ] `whatsapp_enabled` BOOLEAN DEFAULT true
- [ ] `push_enabled` BOOLEAN DEFAULT true

**`support_tickets` tablosu:**
- [ ] `id` UUID PK
- [ ] `business_id` UUID FK → businesses(id)
- [ ] `subject` VARCHAR(255)
- [ ] `message` TEXT
- [ ] `status` VARCHAR(20) DEFAULT 'open' — enum: open | in_progress | closed
- [ ] `admin_note` TEXT
- [ ] `created_at`, `updated_at` TIMESTAMPTZ

**`appointment_logs` tablosu:**
- [ ] `id` UUID PK
- [ ] `appointment_id` UUID FK → appointments(id) ON DELETE CASCADE
- [ ] `changed_by` UUID FK → users(id) NULLABLE (null = guest müşteri)
- [ ] `from_status` VARCHAR(20)
- [ ] `to_status` VARCHAR(20) NOT NULL
- [ ] `note` TEXT
- [ ] `created_at` TIMESTAMPTZ

### 2.3 Index Tanımları

Migration'a eklenecek indexler:
```sql
-- Randevu sorguları
CREATE INDEX idx_appointments_business_status    ON appointments(business_id, status);
CREATE INDEX idx_appointments_staff_start        ON appointments(staff_id, start_at);
CREATE INDEX idx_appointments_business_start     ON appointments(business_id, start_at);
CREATE INDEX idx_appointments_action_token       ON appointments(action_token) WHERE action_token IS NOT NULL;
CREATE INDEX idx_appointments_customer_phone     ON appointments(customer_phone);

-- Concurrency — unique constraint (aktif randevular için)
CREATE UNIQUE INDEX idx_appointments_staff_start_unique
  ON appointments(staff_id, start_at)
  WHERE status NOT IN ('cancelled', 'rejected');

-- Takvim ve müsaitlik
CREATE INDEX idx_blocked_periods_staff_range     ON blocked_periods(staff_id, start_at, end_at);
CREATE INDEX idx_working_hours_staff             ON working_hours(staff_id);

-- İşletme ve kullanıcı
CREATE INDEX idx_businesses_slug                 ON businesses(slug);
CREATE INDEX idx_businesses_category             ON businesses(category);
CREATE INDEX idx_users_business_role             ON users(business_id, role);

-- Log
CREATE INDEX idx_appointment_logs_appointment    ON appointment_logs(appointment_id);
```

### 2.4 Seed Data

- [ ] `super_admin` kullanıcısı oluşturma scripti
- [ ] Demo işletme + personel + hizmet seed'i (geliştirme ortamı için)

---

## FAZ 3 — AUTH MODÜLÜ (OTP + JWT)

### 3.1 OTP ile Giriş Akışı

**Yapılacaklar:**
- [ ] `POST /api/v1/auth/send-otp` — OTP gönder
  - Input: `{ phone: string }`
  - OTP: 6 haneli random, Redis'te `otp:{phone}` key ile sakla, TTL: 5 dakika
  - İletimerkezi API ile SMS gönder
  - Rate limit: 10 istek/dakika/IP
- [ ] `POST /api/v1/auth/verify-otp` — OTP doğrula
  - Input: `{ phone: string, otp: string }`
  - Redis'ten OTP'yi doğrula, sil
  - Access Token (15m) + Refresh Token (30d) üret
  - Refresh Token: HttpOnly Cookie olarak set et
  - Access Token: Response body'de döndür
  - Hata kodları: `OTP_INVALID`, `OTP_EXPIRED`, `USER_BLOCKED`
- [ ] `POST /api/v1/auth/refresh` — Token yenile
  - HttpOnly cookie'den refresh token oku
  - Redis blacklist kontrolü yap
  - Yeni access token üret
- [ ] `POST /api/v1/auth/logout` — Çıkış
  - Refresh token'ı Redis blacklist'e al (`blacklist:{token}` key, TTL: 30d)
  - Cookie'yi temizle

### 3.2 JWT Guard & RBAC

**Yapılacaklar:**
- [ ] `JwtAuthGuard` — her korumalı endpoint için
- [ ] `RolesGuard` — `@Roles()` decorator ile rol kontrolü
- [ ] `@Roles('super_admin', 'business_admin')` decorator
- [ ] `@CurrentUser()` decorator — JWT payload'dan user çıkar
- [ ] Business ownership middleware — `business_id` sahiplik kontrolü
  - `business_admin` → yalnızca kendi business_id'si
  - `staff` → yalnızca kendi business_id'si
  - `super_admin` → tüm business_id'lere erişebilir

### 3.3 Rate Limiting

- [ ] `@nestjs/throttler` ile global rate limiter
  - `/auth/*`: 10 istek/dakika/IP
  - `POST /appointments`: 5 istek/dakika/IP
  - Genel API: 100 istek/dakika/kullanıcı

---

## FAZ 4 — İŞLETME YÖNETİMİ API

### 4.1 İşletme CRUD

**Yapılacaklar:**
- [ ] `POST /api/v1/businesses` — İşletme oluştur `[super_admin]`
  - Slug otomatik üret (name → lowercase, boşluk → tire)
  - Slug benzersizlik kontrolü
  - Varsayılan `notification_settings` kaydı oluştur
  - Approval mode seç: `auto_approve | manual_approve`
- [ ] `GET /api/v1/businesses` — İşletmeleri listele `[super_admin]`
  - Sayfalandırma: `page`, `per_page`
  - Filtreler: `plan`, `category`, `is_active`, `search`
- [ ] `GET /api/v1/businesses/:id` — İşletme detayı `[business_admin, super_admin]`
- [ ] `PATCH /api/v1/businesses/:id` — İşletme güncelle `[business_admin]`
  - Güncellenebilir alanlar: name, description, phone, address, category, timezone, approval_mode, logo_url, cover_url
- [ ] `DELETE /api/v1/businesses/:id` — İşletme sil `[super_admin]`

### 4.2 Public Vitrin Endpoint

- [ ] `GET /api/v1/businesses/slug/:slug` — Vitrin sayfası verisi `[public]`
  - Döndürülecekler: İşletme bilgileri, aktif hizmet listesi (show_price'a göre fiyat), aktif personel listesi
  - `is_active: false` işletmeler için 404 döndür
  - Plan limiti doluysa: hizmetleri göster, randevu slot'u yok mesajı ekle

### 4.3 QR Kod Endpoint

- [ ] `GET /api/v1/businesses/:id/qr` — QR kod indir `[business_admin]`
  - `format` query: `png` (default) | `svg`
  - QR içeriği: `https://platform.com/{slug}`
  - `qrcode` npm paketi kullan
  - Content-Type: `image/png` veya `image/svg+xml`

### 4.4 Plan Limiti Kontrolü

- [ ] `PlanLimitService` — reusable servis
  - `checkMonthlyAppointmentLimit(businessId)` — aylık randevu sayısını kontrol et
  - `checkStaffLimit(businessId)` — personel limiti
  - `checkServiceLimit(businessId)` — hizmet limiti
  - Plan sabitleri:
    ```typescript
    PLAN_LIMITS = {
      free:     { monthly_appointments: 50,       staff: 2,  services: 5  },
      pro:      { monthly_appointments: 500,      staff: 10, services: 50 },
      business: { monthly_appointments: Infinity, staff: Infinity, services: Infinity }
    }
    ```
  - %80 limitte uyarı flag'i döndür (admin banner için)

---

## FAZ 5 — PERSONEL & HİZMET YÖNETİMİ API

### 5.1 Personel CRUD

**Yapılacaklar:**
- [ ] `POST /api/v1/businesses/:id/staff` — Personel ekle `[business_admin]`
  - Input: full_name, phone, avatar_url (opsiyonel), service_ids[]
  - `users` tablosuna role='staff' kaydı oluştur
  - `staff_services` tablosuna hizmet bağlantıları ekle
  - Plan `staff` limiti kontrolü
  - Aynı phone varsa: "Bu telefon numarası zaten kayıtlı" hatası
  - Personel eklendikten sonra varsayılan `working_hours` (7 gün, tümü kapalı) oluştur
- [ ] `GET /api/v1/businesses/:id/staff` — Personel listesi `[business_admin]`
  - Personelin hizmetleri ve çalışma saatleri ile birlikte döner
- [ ] `GET /api/v1/businesses/:id/staff/:staffId` — Personel detayı `[business_admin, staff]`
- [ ] `PATCH /api/v1/businesses/:id/staff/:staffId` — Personel güncelle `[business_admin]`
  - Güncellenebilir: full_name, avatar_url, is_active, service_ids[]
- [ ] `DELETE /api/v1/businesses/:id/staff/:staffId` — Personel sil `[business_admin]`
  - Aktif randevusu varsa silmeyi engelle, uyarı döndür

### 5.2 Çalışma Saatleri

**Yapılacaklar:**
- [ ] `PUT /api/v1/staff/:staffId/working-hours` — Haftalık program kaydet `[business_admin, staff]`
  - Input: 7 günlük program (is_open, start_time, end_time)
  - Mevcut kayıtları UPSERT et (UNIQUE staff_id + day_of_week)
  - Saatler yerel saat olarak saklanır (timezone-aware değil, saat string: "09:00")
- [ ] `GET /api/v1/staff/:staffId/working-hours` — Haftalık program getir `[business_admin, staff]`

### 5.3 Geçici Müsaitlik Kapatma

**Yapılacaklar:**
- [ ] `POST /api/v1/staff/:staffId/blocked-periods` — Geçici kapatma ekle `[business_admin, staff]`
  - Input: `{ start_at: ISO8601_UTC, end_at: ISO8601_UTC, reason?: string }`
  - Kapatma anında o aralıkta mevcut randevu varsa: admin'e push notification gönder (randevular otomatik iptal edilmez)
- [ ] `GET /api/v1/staff/:staffId/blocked-periods` — Kapatmaları listele `[business_admin, staff]`
  - `from` ve `to` tarih filtresi destekle
- [ ] `DELETE /api/v1/staff/:staffId/blocked-periods/:id` — Kapatma sil `[business_admin, staff]`

### 5.4 Hizmet CRUD

**Yapılacaklar:**
- [ ] `POST /api/v1/businesses/:id/services` — Hizmet ekle `[business_admin]`
  - Input: name, category, duration_minutes, price, currency, show_price, staff_ids[]
  - Plan `services` limiti kontrolü
- [ ] `GET /api/v1/businesses/:id/services` — Hizmet listesi `[public]`
  - Public erişimde `show_price=false` olan hizmetlerde price alanını gizle
  - Hizmeti yapabilen personel listesi ile döner
- [ ] `PATCH /api/v1/businesses/:id/services/:sid` — Hizmet güncelle `[business_admin]`
- [ ] `DELETE /api/v1/businesses/:id/services/:sid` — Hizmet sil `[business_admin]`
  - Aktif randevusu varsa silmeyi engelle

---

## FAZ 6 — TAKVİM & MÜSAİTLİK API

### 6.1 Müsait Slot Hesaplama

**Yapılacaklar:**
- [ ] `GET /api/v1/availability` — Müsait slotlar `[public]`
  - Query params: `business_id`, `service_id`, `staff_id` (opsiyonel), `date` (YYYY-MM-DD)
  - Hesaplama mantığı (sırasıyla):
    1. İşletmenin timezone'u al
    2. Seçilen tarih + gün için working_hours al (is_open kontrolü)
    3. blocked_periods aralıklarını çıkar
    4. Onaylanmış mevcut randevuları (`status NOT IN ('cancelled', 'rejected')`) + sürelerini çıkar
    5. Kalan boşlukları `service.duration_minutes` değerine göre slotlara böl
  - `staff_id` belirtilmemişse: tüm aktif personelin slotlarını birleştir, "Fark etmez" seçeneği için en uygun personeli ata
  - Response: Her slot için `start_local`, `end_local`, `start_utc`, `end_utc`, `available`, `staff_id`

### 6.2 Timezone Yönetimi

**Yapılacaklar:**
- [ ] `luxon` kütüphanesi ile timezone dönüşüm helper'ları:
  - `toUTC(localTime, timezone)` — yerel → UTC
  - `toLocal(utcTime, timezone)` — UTC → yerel
  - `formatForDisplay(utcTime, timezone, locale)` — bildirim metni için
- [ ] DST (yaz saati) geçişleri `luxon` tarafından otomatik yönetilir
- [ ] `working_hours` saatleri TIME tipinde (saat string), slot hesaplamada timezone ile birleştirilir

---

## FAZ 7 — RANDEVU AKIŞI API

### 7.1 Randevu Oluşturma (Guest)

**Yapılacaklar:**
- [ ] `POST /api/v1/appointments` — Randevu oluştur `[public/guest]`
  - Input: `{ business_id, staff_id, service_id, customer_name, customer_phone, start_at (UTC) }`
  - Sırasıyla kontroller:
    1. Plan aylık randevu limiti kontrolü (`checkMonthlyAppointmentLimit`)
    2. Slot müsaitlik kontrolü (çift kontrol — race condition önlemi)
    3. PostgreSQL Advisory Lock al: `pg_advisory_xact_lock(hash(staff_id + start_at))`
    4. Slot tekrar kontrol et (lock sonrası)
    5. `end_at` hesapla: `start_at + service.duration_minutes`
    6. `action_token` üret (UUID), Redis'e kaydet TTL: 48 saat
    7. Randevu oluştur
  - `approval_mode = 'auto_approve'` → status: 'approved'
  - `approval_mode = 'manual_approve'` → status: 'pending'
  - Başarı sonrası bildirim kuyruğuna ekle (Faz 8)
  - Rate limit: 5 istek/dakika/IP

### 7.2 Randevu Yönetimi (Admin/Staff)

**Yapılacaklar:**
- [ ] `GET /api/v1/appointments` — Randevu listesi `[business_admin, staff]`
  - Filtreler: `status`, `staff_id`, `date`, `search` (müşteri adı/telefon)
  - Sayfalandırma
  - Staff rolü → yalnızca kendi randevuları
- [ ] `GET /api/v1/appointments/:id` — Randevu detayı `[business_admin, staff]`
- [ ] `PATCH /api/v1/appointments/:id/approve` — Onayla `[business_admin]`
  - Status: pending → approved
  - `appointment_logs` kaydı ekle
  - Müşteriye SMS + WhatsApp gönder (bildirim kuyruğuna ekle)
- [ ] `PATCH /api/v1/appointments/:id/reject` — Reddet `[business_admin]`
  - Input: `{ rejection_reason: string }`
  - Status: pending → rejected
  - `appointment_logs` kaydı ekle
  - Müşteriye SMS + WhatsApp (ret sebebi ile) gönder
- [ ] `PATCH /api/v1/appointments/:id/complete` — Tamamlandı işaretle `[staff]`
  - Status: approved → completed
- [ ] `PATCH /api/v1/appointments/:id/no-show` — Gelmedi işaretle `[staff]`
  - Status: approved → no_show

### 7.3 İptal & Erteleme (Token ile — Guest)

**Yapılacaklar:**
- [ ] `POST /api/v1/appointments/action` — İptal/Ertele `[public/guest]`
  - Input: `{ token: UUID, action: 'cancel' | 'reschedule', reschedule_date?: string, reschedule_time?: string }`
  - Token doğrulama: Redis'te `action_token:{token}` key varlığı + `action_token_used` kontrolü
  - Token geçersizse: `TOKEN_INVALID` hatası
  - Token süresi dolmuşsa: `TOKEN_EXPIRED` hatası
  - İptal → status: approved → cancelled, token'ı işaretlenmiş say
  - Erteleme → yeni slotu kontrol et, mevcut randevuyu iptal et, yeni randevu oluştur (status: rescheduled → approved), yeni action_token üret
  - Admin/staff'e push notification gönder
  - `appointment_logs` kaydı ekle (changed_by: null)

### 7.4 State Machine Özeti

```
pending     → approved   → completed
pending     → rejected
approved    → cancelled  (müşteri token veya admin)
approved    → rescheduled → approved (yeni slot onayı)
approved    → no_show
```

---

## FAZ 8 — BİLDİRİM SİSTEMİ

### 8.1 Queue Mimarisi (Redis Bull)

**Yapılacaklar:**
- [ ] 3 ayrı Bull Queue tanımla:
  - `notification-queue` — anlık SMS/WhatsApp/Push gönderimi
  - `reminder-queue` — zamanlanmış hatırlatmalar
  - `cleanup-queue` — süresi dolmuş token temizleme (günlük cron)
- [ ] `NotificationModule` — SMS, WhatsApp, Push alt modülleri

### 8.2 SMS Modülü (İletimerkezi)

**Yapılacaklar:**
- [ ] `SmsService` — toplusmsapi.com entegrasyonu
  - `sendSms(phone, message)` — HTTP POST isteği
  - Hata yönetimi + retry (3 kez, exponential backoff)
- [ ] SMS şablonları:
  - **Randevu Onay:** `Merhaba {ad}, {işletme} randevunuz onaylandı ✅ 📅 {tarih} {saat} 💈 {hizmet} ({personel}) İptal/Erteleme: {link}`
  - **Randevu Hatırlatma:** `Merhaba {ad}, Randevunuzu hatırlatırız 🔔 📅 {tarih} {saat} 📍 {işletme} İptal/Erteleme: {link}`
  - **Randevu Ret:** `Merhaba {ad}, {tarih} {saat} randevunuz onaylanamadı. Sebep: {sebep} Yeni randevu: {vitrin_link}`
  - **İptal Onayı:** `Merhaba {ad}, {tarih} {saat} randevunuz iptal edildi.`

### 8.3 WhatsApp Modülü

**Yapılacaklar:**
- [ ] `WhatsappService` — WhatsApp Business API entegrasyonu
  - `sendMessage(phone, message)` — Meta Graph API HTTP POST
  - Phone format: international (+90...)
  - Aynı SMS şablonları, WhatsApp formatında

### 8.4 Push Notification Modülü

**Yapılacaklar:**
- [ ] `PushService` — Web Push API
  - VAPID key çifti üret ve `.env`'e kaydet
  - `sendPush(userId, { title, body, url })` — push gönder
  - Push abonelik kaydı için endpoint: `POST /api/v1/push/subscribe`
  - Push abonelik kaydı için tablo: `push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh)`

### 8.5 Bildirim Tetikleyicileri

| Olay | Alıcı | Kanal |
|------|-------|-------|
| Randevu oluşturuldu (auto_approve) | Müşteri | SMS + WhatsApp |
| Randevu oluşturuldu (manual_approve) | Admin + Staff | Push |
| Randevu onaylandı | Müşteri | SMS + WhatsApp |
| Randevu reddedildi | Müşteri | SMS + WhatsApp |
| Randevu iptal edildi (müşteri) | Admin + Staff | Push |
| Randevu iptal edildi (admin) | Müşteri | SMS + WhatsApp |
| Randevu hatırlatma | Müşteri | SMS + WhatsApp |
| Personel geçici kapatma (çakışma) | Admin | Push |

### 8.6 Zamanlanmış Hatırlatmalar

**Yapılacaklar:**
- [ ] Randevu oluşturulduğunda `reminder-queue`'ya job ekle: `reminder_minutes` önce fire et
- [ ] İşletme hatırlatma ayarı değiştiğinde aktif job'ları güncelle
- [ ] Seçenekler: 60 | 120 | 180 | 1440 | 2880 dakika öncesi

---

## FAZ 9 — RAPORLAMA API

### 9.1 Genel Dashboard

- [ ] `GET /api/v1/businesses/:id/reports/overview` `[business_admin]`
  - Query: `period` (YYYY-MM default = bu ay)
  - Döndürülecekler:
    - `total_appointments`, `completed`, `cancelled`, `no_show`, `pending`
    - `completion_rate` (%)
    - `estimated_revenue` (tamamlanan randevu × hizmet fiyatı)
    - `top_services[]` (isim + sayı)
    - `peak_hours[]` (saat + sayı)
    - `peak_days[]` (gün + sayı)
    - `staff_performance[]`
    - Plan limit uyarısı: `plan_usage_percent`

### 9.2 Randevu Raporu

- [ ] `GET /api/v1/businesses/:id/reports/appointments` `[business_admin]`
  - Query: `from`, `to`, `staff_id`, `status`
  - Günlük/haftalık/aylık trend serisi (grafik için)
  - İptal ve no-show oranları

### 9.3 Hizmet Raporu

- [ ] `GET /api/v1/businesses/:id/reports/services` `[business_admin]`
  - En çok tercih edilen hizmetler (sıralı)
  - Hizmet bazında tahmini gelir

### 9.4 Personel Performans Raporu

- [ ] `GET /api/v1/businesses/:id/reports/staff` `[business_admin]`
  - Personel bazında: tamamlanan randevu sayısı, no-show oranı, tahmini gelir katkısı

### 9.5 Yoğunluk Haritası

- [ ] `GET /api/v1/businesses/:id/reports/heatmap` `[business_admin]`
  - Haftanın günleri × saat dilimi matris formatında yoğunluk verisi

### 9.6 Gelir Raporu

- [ ] `GET /api/v1/businesses/:id/reports/revenue` `[business_admin]`
  - Filtreler: tarih aralığı, personel, hizmet kategorisi
  - Tahmini gelir (ödeme takibi değil, hizmet ücreti × tamamlanan)

---

## FAZ 10 — SUPER ADMIN API

### 10.1 İşletme Yönetimi

- [ ] `GET /api/v1/admin/businesses` `[super_admin]`
  - Tüm işletmeler — arama + filtreleme (plan, kategori, durum)
  - Sayfalandırma
- [ ] `PATCH /api/v1/admin/businesses/:id/plan` `[super_admin]`
  - Input: `{ plan: 'free' | 'pro' | 'business', subscription_ends_at? }`
  - Plan yükseltme: anında aktif
  - Plan düşürme: mevcut dönem sonunda

### 10.2 Kullanıcı Yönetimi

- [ ] `GET /api/v1/admin/users` `[super_admin]`
  - Filtreler: role, is_active, business_id
- [ ] `POST /api/v1/admin/users/:id/block` `[super_admin]`
  - `is_active: false` yap
  - Aktif JWT'leri geçersiz kıl (Redis blacklist)
- [ ] `DELETE /api/v1/admin/users/:id` `[super_admin]`

### 10.3 Platform İstatistikleri

- [ ] `GET /api/v1/admin/stats` `[super_admin]`
  - Toplam işletme sayısı (aktif/pasif)
  - Plan dağılımı (Free/Pro/Business)
  - Toplam randevu (platform geneli, bu ay / toplam)
  - Günlük/aylık büyüme grafik verisi

### 10.4 Destek Talepleri

- [ ] `GET /api/v1/admin/support-tickets` `[super_admin]`
  - Filtreler: status (open|in_progress|closed), business_id
- [ ] `PATCH /api/v1/admin/support-tickets/:id` `[super_admin]`
  - Input: `{ status, admin_note }`

---

## FAZ 11 — FRONTEND GENEL ALTYAPI

### 11.1 Proje Yapısı

```
src/
├── app/
│   ├── router.tsx          (React Router v6 route tanımları)
│   └── providers.tsx       (QueryClient, i18n, vb.)
├── pages/
│   ├── public/             (vitrin, randevu alma, token action)
│   ├── admin/              (business admin paneli)
│   ├── staff/              (personel ekranları)
│   └── superadmin/         (platform yönetimi)
├── components/
│   ├── ui/                 (Button, Input, Modal, Badge, Toast, Spinner)
│   └── shared/             (AppointmentCard, StaffSelector, ServiceCard, vb.)
├── hooks/
│   ├── useAppointments.ts
│   ├── useAvailability.ts
│   ├── useAuth.ts
│   └── useBusiness.ts
├── services/
│   ├── api.ts              (Axios instance, interceptor)
│   ├── auth.service.ts
│   └── ...
├── store/
│   └── auth.store.ts       (Zustand)
├── locales/
│   ├── tr.json
│   └── en.json
└── utils/
    ├── timezone.ts
    └── formatters.ts
```

### 11.2 Axios Konfigürasyonu

**Yapılacaklar:**
- [ ] Base URL: `/api/v1`
- [ ] Request interceptor: Authorization header'a access token ekle
- [ ] Response interceptor: 401 gelince refresh token ile yenile, yenileme başarısız → logout
- [ ] Error interceptor: hata mesajlarını Türkçe/İngilizce göster

### 11.3 i18n Kurulumu

**Yapılacaklar:**
- [ ] `i18next` + `react-i18next` konfigürasyonu
- [ ] `tr.json` ve `en.json` dosyaları — tüm arayüz metinleri
- [ ] Dil belirleme: localStorage → tarayıcı dili → varsayılan 'tr'
- [ ] Tarih/saat formatları: `tr-TR` / `en-US`

### 11.4 Routing Yapısı

```
/                          → Public: işletme listesi / landing
/:slug                     → Public: işletme vitrin sayfası
/:slug/book                → Public: randevu alma (3 adım)
/appointments/action       → Public: token ile iptal/ertele

/login                     → Auth: OTP giriş
/admin                     → Admin: dashboard
/admin/staff               → Admin: personel yönetimi
/admin/services            → Admin: hizmet yönetimi
/admin/appointments        → Admin: randevu listesi
/admin/calendar            → Admin: takvim görünümü
/admin/reports             → Admin: raporlar
/admin/settings            → Admin: işletme ayarları

/staff                     → Staff: günlük takvim
/staff/appointments        → Staff: randevu listesi

/superadmin                → SuperAdmin: platform dashboard
/superadmin/businesses     → SuperAdmin: işletme yönetimi
/superadmin/users          → SuperAdmin: kullanıcı yönetimi
/superadmin/tickets        → SuperAdmin: destek talepleri
```

### 11.5 Auth Store (Zustand)

- [ ] `user` — mevcut kullanıcı
- [ ] `accessToken` — memory'de tut (localStorage'a kaydetme)
- [ ] `isAuthenticated` — boolean
- [ ] `login(phone, otp)`, `logout()`, `refreshToken()` aksiyonları

---

## FAZ 12 — FRONTEND: PUBLIC VİTRİN & RANDEVU ALMA

### 12.1 İşletme Vitrin Sayfası (`/:slug`)

**Yapılacaklar:**
- [ ] İşletme başlığı: logo, kapak görseli, isim, kategori, adres, telefon
- [ ] Hizmet listesi: kart bazlı, fiyat (show_price kontrolü), süre
- [ ] Personel listesi: avatar, isim
- [ ] "Randevu Al" CTA butonu — büyük, belirgin
- [ ] Plan limiti doluysa: "Bu ay randevu kapasitesi doldu, lütfen işletmeyi arayın" banner'ı
- [ ] Mobil-first tasarım, Tailwind CSS
- [ ] SEO: `<title>`, `<meta>` etiketleri

### 12.2 Randevu Alma Akışı — 3 Adım (`/:slug/book`)

**Adım 1 — Hizmet & Personel Seçimi:**
- [ ] Hizmet kartları listesi (seçilebilir)
- [ ] Personel seçimi: "Fark etmez" seçeneği dahil
- [ ] "İleri" butonu — hizmet seçilmeden aktif olmaz

**Adım 2 — Tarih & Saat Seçimi:**
- [ ] Takvim bileşeni — min. bugün, max. 60 gün ilerisi
- [ ] Seçilen gün için müsait slotlar listesi (`/availability` API çağrısı)
- [ ] Müsait slotlar yeşil, dolu slotlar gri gösterilir
- [ ] Yükleme durumunda skeleton loader
- [ ] "Geri" ve "İleri" butonları

**Adım 3 — Bilgi & Onay:**
- [ ] Ad Soyad input (min 2 karakter)
- [ ] Telefon input (Türkiye formatı için maske, uluslararası destek)
- [ ] Randevu özeti: tarih, saat, hizmet, personel
- [ ] "Randevumu Al" butonu — loading state ile
- [ ] Başarı ekranı: `✅ Randevunuz alındı! {tarih}, {saat}` — büyük, net
- [ ] Hata ekranı: `Bu saat doldu, lütfen başka bir saat seçin.`

### 12.3 Token ile Aksiyon Sayfası (`/appointments/action`)

**Yapılacaklar:**
- [ ] URL'den `token` query parametresi al
- [ ] Token doğrulama API çağrısı (`GET /appointments/action?token=...` ile randevu bilgisi al)
- [ ] Randevu bilgilerini göster (tarih, saat, işletme, hizmet)
- [ ] "Randevumu İptal Et" butonu — onay modal'ı ile
- [ ] "Randevumu Ertele" butonu → tarih/saat seçim ekranı → yeni slot onayı
- [ ] Token geçersiz/süresi dolmuş: açıklayıcı hata sayfası

---

## FAZ 13 — FRONTEND: ADMİN PANELİ

### 13.1 Dashboard (`/admin`)

**Yapılacaklar:**
- [ ] Bugün / bu hafta / bu ay randevu sayısı kartları
- [ ] Durum dağılımı: onaylı, bekleyen, iptal, tamamlanan
- [ ] Plan limit uyarı banner'ı (%80+ dolulukta göster)
- [ ] Yaklaşan randevular listesi (bugün)

### 13.2 Personel Yönetimi (`/admin/staff`)

**Yapılacaklar:**
- [ ] Personel listesi: kart/tablo görünümü, aktif/pasif badge
- [ ] Personel ekleme modal'ı: isim, telefon, yapabileceği hizmetler (multi-select)
- [ ] Personel düzenleme
- [ ] Çalışma saatleri ayarı: her gün için aç/kapat toggle + saat aralığı
- [ ] Geçici kapatma ekleme: tarih + saat aralığı seçici

### 13.3 Hizmet Yönetimi (`/admin/services`)

**Yapılacaklar:**
- [ ] Hizmet listesi
- [ ] Hizmet ekleme/düzenleme form'u: isim, kategori, süre (dakika slider), fiyat, para birimi, fiyat göster toggle, personel ataması

### 13.4 Randevu Yönetimi (`/admin/appointments`)

**Yapılacaklar:**
- [ ] Randevu listesi: filtreler (durum, tarih, personel, arama)
- [ ] Randevu kartı: müşteri adı, telefon, hizmet, personel, tarih/saat, durum badge
- [ ] Onayla / Reddet aksiyon butonları (bekleyen randevular için)
- [ ] Red sebebi giriş modal'ı
- [ ] Randevu detay modal'ı: tam bilgiler + log geçmişi

### 13.5 Takvim Görünümü (`/admin/calendar`)

**Yapılacaklar:**
- [ ] Haftalık/günlük takvim grid'i
- [ ] Personel bazında renk kodlaması
- [ ] Randevu kartları: tıklanınca detay modal'ı
- [ ] Bloklu periyotlar gri blok olarak gösterilir

### 13.6 Raporlar (`/admin/reports`)

**Yapılacaklar:**
- [ ] Genel özet kartları
- [ ] Randevu trend grafiği (günlük/haftalık/aylık, Recharts)
- [ ] Hizmet dağılımı (pasta grafik)
- [ ] Personel performans tablosu
- [ ] Yoğunluk ısı haritası (heatmap grid)
- [ ] Tarih filtresi

### 13.7 İşletme Ayarları (`/admin/settings`)

**Yapılacaklar:**
- [ ] İşletme bilgileri formu: isim, açıklama, telefon, adres, kategori, timezone, approval_mode
- [ ] Logo ve kapak görseli yükleme (drag & drop + preview)
- [ ] Bildirim ayarları: SMS/WhatsApp/Push toggle'ları, hatırlatma zamanı seçimi
- [ ] QR kod indirme butonu (PNG / SVG)
- [ ] Abonelik planı bilgisi + yükseltme CTA

---

## FAZ 14 — FRONTEND: PERSONEL PANELİ

### 14.1 Günlük Takvim (`/staff`)

**Yapılacaklar:**
- [ ] Bugünün randevuları — zaman çizelgesi formatı
- [ ] Her randevu kartı: müşteri adı, hizmet, başlangıç/bitiş saati
- [ ] "Tamamlandı" ve "Gelmedi" butonu her kartta
- [ ] Tarih navigasyonu (önceki/sonraki gün)
- [ ] Geçici kapatma ekle butonu: anlık veya ileri tarih için

### 14.2 Randevu Listesi (`/staff/appointments`)

**Yapılacaklar:**
- [ ] Tarih filtreli randevu listesi
- [ ] Durum güncelleme butonları

---

## FAZ 15 — FRONTEND: SUPER ADMIN PANELİ

### 15.1 Platform Dashboard (`/superadmin`)

**Yapılacaklar:**
- [ ] Toplam işletme sayısı (aktif/pasif)
- [ ] Plan dağılımı (Free/Pro/Business pasta grafik)
- [ ] Toplam platform randevu sayısı
- [ ] Günlük/aylık büyüme grafiği

### 15.2 İşletme Yönetimi (`/superadmin/businesses`)

**Yapılacaklar:**
- [ ] İşletme listesi: arama, filtreler (plan, kategori, durum)
- [ ] İşletme detay sayfası
- [ ] Plan değiştirme modal'ı
- [ ] Pasife alma / silme aksiyonları

### 15.3 Kullanıcı Yönetimi (`/superadmin/users`)

**Yapılacaklar:**
- [ ] Kullanıcı listesi + filtreler
- [ ] Engelle / Sil aksiyonları

### 15.4 Destek Talepleri (`/superadmin/tickets`)

**Yapılacaklar:**
- [ ] Talep listesi + status filtresi
- [ ] Talep detayı + durum güncelleme + iç not ekleme

---

## FAZ 16 — GÖRSEL YÜKLEME

### 16.1 Backend Upload Servisi

**Yapılacaklar:**
- [ ] `POST /api/v1/upload/image` — Görsel yükle `[business_admin, staff]`
- [ ] `sharp` kütüphanesi ile işleme:
  - Logo: max 500×500px, WEBP, max 500KB
  - Kapak: max 1200×400px, WEBP, max 1MB
  - Avatar: max 400×400px, WEBP, max 300KB
- [ ] Dosya adı: `{uuid}.webp`
- [ ] Depolama: `./uploads/{type}/{filename}` (local — v1)
- [ ] Response: `{ url: "https://platform.com/uploads/..." }`
- [ ] v1: Local server (`UPLOAD_DRIVER=local`)
- [ ] Gelecek: S3 / Cloudflare R2 (`UPLOAD_DRIVER=s3`)

### 16.2 Nginx Static File Serving

- [ ] `/uploads/` path'i `./uploads` klasöründen serve et
- [ ] Cache-Control: 30 gün
- [ ] nginx.conf'a ekle

---

## FAZ 17 — PWA & PUSH NOTIFICATION

### 17.1 PWA Konfigürasyonu

**Yapılacaklar:**
- [ ] `vite-plugin-pwa` (Workbox) kurulumu
- [ ] `manifest.json`:
  - `name`: SaaS Randevu
  - `short_name`: Randevu
  - `display`: standalone
  - `theme_color`, `background_color`
  - Ikon seti: 192×192, 512×512
- [ ] Service Worker:
  - Offline cache stratejisi (static assets)
  - Push notification dinleyici
- [ ] iOS uyumluluğu: `apple-touch-icon`

### 17.2 Push Notification Entegrasyonu (Frontend)

**Yapılacaklar:**
- [ ] VAPID public key ile push subscription al
- [ ] Subscription'ı backend'e kaydet (`POST /push/subscribe`)
- [ ] Service worker'da `push` event listener — bildirim göster
- [ ] `notificationclick` event — uygulamayı aç / ilgili sayfaya yönlendir

---

## FAZ 18 — TEST & QA

### 18.1 Backend Unit Testler

**Yapılacaklar:**
- [ ] `AppointmentService.createAppointment` — concurrency testi, plan limit testi
- [ ] `AvailabilityService.getSlots` — timezone hesaplama testi, blocked period testi
- [ ] `AuthService` — OTP doğrulama, token yenileme testi
- [ ] `PlanLimitService` — limit hesaplama testi

### 18.2 Backend E2E Testler

**Yapılacaklar:**
- [ ] Auth flow: OTP gönder → doğrula → token yenile → logout
- [ ] Randevu akışı: vitrin → müsait slot → randevu oluştur → onay bildirimi
- [ ] Token ile iptal/ertele akışı
- [ ] Concurrency testi: aynı anda 2 randevu isteği → yalnızca 1 başarılı olmalı

### 18.3 Frontend Testler

**Yapılacaklar:**
- [ ] Randevu alma akışı (3 adım) E2E testi — Playwright
- [ ] Token aksiyon sayfası testi
- [ ] Admin panel CRUD testleri

### 18.4 Performans & Güvenlik

**Yapılacaklar:**
- [ ] API rate limit testleri
- [ ] XSS koruması: tüm kullanıcı girişleri sanitize edildi mi?
- [ ] SQL injection: TypeORM parameterized query kullanımı
- [ ] JWT secret rotation prosedürü

---

## FAZ 19 — PRODUCTION DEPLOY

### 19.1 Production Konfigürasyonu

**Yapılacaklar:**
- [ ] `.env` dosyası üretim değerleriyle doldur
- [ ] SSL sertifikası (Let's Encrypt) — Nginx'e ekle
- [ ] `NODE_ENV=production` kontrolleri
- [ ] Database migration: `docker compose exec backend npm run migration:run`
- [ ] Super admin seed: `docker compose exec backend npm run seed:admin`

### 19.2 Deployment Adımları

```bash
# İlk kurulum
cp .env.example .env
# .env dosyasını doldur
docker compose up -d

# Migration çalıştır
docker compose exec backend npm run migration:run

# Logları izle
docker compose logs -f backend

# Güncelleme
git pull
docker compose build
docker compose up -d
```

### 19.3 Monitoring & Bakım

**Yapılacaklar:**
- [ ] Health check endpoint: `GET /api/v1/health` — DB + Redis bağlantı durumu
- [ ] Docker healthcheck'ler (zaten docker-compose'da tanımlı)
- [ ] Log rotasyonu (Docker logging driver)
- [ ] Yedekleme stratejisi: PostgreSQL dump (günlük cron)
- [ ] Redis AOF persistence aktif et

---

## STANDART API RESPONSE YAPISI

Tüm API yanıtları şu zarflama yapısını kullanır:

**Başarılı tekil yanıt:**
```json
{ "success": true, "data": {} }
```

**Başarılı liste yanıtı:**
```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "per_page": 20, "total": 150, "total_pages": 8 }
}
```

**Hata yanıtı:**
```json
{
  "success": false,
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "Bu saat dilimi dolu, lütfen başka bir saat seçin.",
    "message_en": "This time slot is already taken."
  }
}
```

---

## HATA KODLARI

| Kod | Açıklama | HTTP |
|-----|----------|------|
| `SLOT_NOT_AVAILABLE` | Seçilen saat müsait değil | 409 |
| `BUSINESS_CLOSED` | İşletme o gün kapalı | 409 |
| `STAFF_UNAVAILABLE` | Personel o saatte müsait değil | 409 |
| `TOKEN_INVALID` | Aksiyon token geçersiz/kullanılmış | 400 |
| `TOKEN_EXPIRED` | Aksiyon token süresi dolmuş | 400 |
| `PLAN_LIMIT_REACHED` | Abonelik planı limiti doldu | 403 |
| `BUSINESS_NOT_FOUND` | İşletme bulunamadı | 404 |
| `STAFF_NOT_FOUND` | Personel bulunamadı | 404 |
| `SERVICE_NOT_FOUND` | Hizmet bulunamadı | 404 |
| `OTP_INVALID` | OTP kodu hatalı | 400 |
| `OTP_EXPIRED` | OTP süresi dolmuş | 400 |
| `USER_BLOCKED` | Kullanıcı engellendi | 403 |

---

## YAPIM SIRASI ÖNERİSİ (SPRINT PLANI)

| Sprint | Fazlar | Çıktı |
|--------|--------|-------|
| **Sprint 1** | Faz 1 + Faz 2 | Docker ayakta, DB şema hazır |
| **Sprint 2** | Faz 3 + Faz 4 | Auth çalışıyor, işletme CRUD hazır |
| **Sprint 3** | Faz 5 + Faz 6 | Personel/hizmet yönetimi + müsait slot API |
| **Sprint 4** | Faz 7 | Randevu oluşturma, onay, iptal/ertele akışı |
| **Sprint 5** | Faz 8 | SMS + WhatsApp + Push bildirimler |
| **Sprint 6** | Faz 11 + Faz 12 | Frontend altyapı + public vitrin + randevu alma |
| **Sprint 7** | Faz 13 + Faz 14 | Admin paneli + personel paneli |
| **Sprint 8** | Faz 9 + Faz 10 + Faz 15 | Raporlama + Super admin |
| **Sprint 9** | Faz 16 + Faz 17 | Görsel yükleme + PWA |
| **Sprint 10** | Faz 18 + Faz 19 | Test, QA, production deploy |
