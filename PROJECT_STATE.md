# Proje Durumu — multiagent-randevu-app
Son güncelleme: 2026-03-14

---

## Genel Bakış
Multi-tenant SaaS randevu sistemi (berber, kuaför, nail art, araç bakım).
- **Backend:** NestJS + TypeORM + PostgreSQL + Redis + Bull
- **Frontend:** React 18 + Vite + Tailwind CSS + PWA
- **Deploy:** Docker Compose (local: port 8080 nginx, 5000 frontend, 3000 backend)

---

## Docker & Ortam

### Container İsimleri
| Servis    | Container        | Port     |
|-----------|-----------------|----------|
| db        | randevu2_db     | internal |
| redis     | randevu2_redis  | internal |
| backend   | randevu2_backend| 3000:3000|
| frontend  | randevu2_frontend| 5000:80 |
| nginx     | randevu2_nginx  | 8080:80  |

### Önemli Notlar
- `version: '3.9'` obsolete warning var, zararsız
- nginx: `./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro` (NOT nginx.conf)
- Her rebuild sonrası tarayıcıda **Clear site data** gerekli (PWA SW cache)
- SW `devOptions: { enabled: false }` ile kapatıldı ama hâlâ eski cache sorun çıkarabilir

### .env Değişkenleri
```
APP_URL=http://localhost
NODE_ENV=development
DB_PASSWORD=Kc.5412019
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/randevu_db
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=e35648b00ea367d5b7e2665b9d1d7e4fa14d4aebaa4766f8ab47e94a3e718aad
JWT_REFRESH_SECRET=b33adcbb489c549dba34555a4c9c4441aa2584bc27e0934bb7efe46ff241b2d8
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
SUPER_ADMIN_PHONE=+905455206512
ILETIMERKEZI_API_KEY=fd5ca5fa0c505560e56caec82ba38306
ILETIMERKEZI_HASH=4f67d89c337776c816ed5361df6d2363b1b093eaccf5160051818d8118c8eec3
ILETIMERKEZI_SENDER=KAGANCOSKUN
UPLOAD_DRIVER=local
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_BASE_URL=http://localhost/uploads
```

---

## SMS Servisi
- **Provider:** İletimerkezi (iletimerkezi.com)
- **API:** GET `https://api.iletimerkezi.com/v1/send-sms/get/`
- **Params:** `key`, `hash`, `text`, `receipents` (5xxxxxxxxx formatı), `sender`, `iys=0`
- **Dosya:** `backend/src/notifications/sms/sms.service.ts`
- **Sorun:** İletimerkezi'de local IP whitelist gerekiyor — production'da sunucu IP'si eklenmeli

---

## Veritabanı
- Migration çalıştırıldı: `npm run migration:run:prod`
- Tablo: 11 tablo, 14 index
- Super admin seed: `npm run seed:admin:prod` → `+905455206512` super_admin rolüyle eklendi
- Migration dosyası: `backend/src/database/run-migrations.ts` (prod için compiled JS)
- Seed dosyası: `backend/src/seeds/admin.seed.prod.ts` (prod için compiled JS)

---

## Backend Endpoint Haritası

### Auth
- `POST /api/v1/auth/send-otp` — telefon gir, OTP gönder
- `POST /api/v1/auth/verify-otp` — OTP doğrula, JWT + cookie
- `POST /api/v1/auth/refresh` — token yenile
- `POST /api/v1/auth/logout`

### Super Admin (`/api/v1/admin/*`) — role: super_admin
- `GET /admin/businesses?page&per_page&search&plan`
- `GET /admin/stats`
- `PATCH /admin/businesses/:id/plan` — body: `{plan, subscription_ends_at?}`
- `POST /admin/users/:id/block`
- `DELETE /admin/users/:id`
- `GET /admin/support-tickets`
- `PATCH /admin/support-tickets/:id`

### Businesses — `POST/GET /businesses` (super_admin)
- `GET /businesses/slug/:slug` — public vitrin
- `GET/PATCH /businesses/:id` — admin kendi işletmesini görür/günceller
- `GET /businesses/:id/plan-usage`
- `GET/PATCH /businesses/:id/notification-settings`
- `GET /businesses/:id/qr`

### Staff — `business_admin`
- `GET/POST /businesses/:businessId/staff`
- `GET/PATCH/DELETE /businesses/:businessId/staff/:staffId`
- `GET/PATCH /staff/:staffId/working-hours`
- `POST/GET /staff/:staffId/blocked-periods`
- `DELETE /staff/:staffId/blocked-periods/:periodId`

### Services — `business_admin`
- `GET/POST /businesses/:businessId/services` (GET public)
- `PATCH/DELETE /businesses/:businessId/services/:serviceId`

### Availability & Appointments
- `GET /businesses/:businessId/availability?staffId&serviceId&date`
- `POST /appointments` — randevu oluştur (public)
- `GET /appointments?businessId&page&status`
- `PATCH /appointments/:id/approve|reject|complete|no-show`
- `POST /appointments/action` — müşteri iptal/erteleme token ile

### Reports
- `GET /businesses/:businessId/reports/overview?from&to`
- `GET /businesses/:businessId/reports/heatmap`

---

## Frontend Sayfa Durumu

### Tamamlanan ✅
- `LoginPage` — OTP akışı, +90 prefix, role bazlı yönlendirme
- `SuperAdminLayout` — sidebar, çıkış
- `SuperAdminDashboard` — platform istatistikleri
- `SuperAdminBusinessesPage` — liste, filtre, plan değiştirme, pagination

### Yapılacak ⏳
- `AdminLayout` — sidebar yazıldı ama router'a eklenmedi
- `AdminDashboardPage` — placeholder
- `AdminStaffPage` — placeholder
- `AdminServicesPage` — placeholder
- `AdminAppointmentsPage` — placeholder
- `AdminSettingsPage` — placeholder
- `AdminReportsPage` — placeholder
- `StaffDashboardPage` — placeholder
- `StaffAppointmentsPage` — placeholder
- `StorefrontPage` — placeholder (public /:slug)
- `BookingPage` — placeholder (public /:slug/book)
- `AppointmentActionPage` — placeholder

---

## Router Yapısı (router.tsx)
```
/login                → LoginPage
/:slug                → StorefrontPage (public)
/:slug/book           → BookingPage (public)
/appointments/action  → AppointmentActionPage (public)

/admin                → RequireAuth(business_admin) → AdminDashboard  [Layout EKLENMEDİ]
/admin/appointments   → RequireAuth(business_admin) → AdminAppointments
/admin/staff          → RequireAuth(business_admin) → AdminStaff
/admin/services       → RequireAuth(business_admin) → AdminServices
/admin/reports        → RequireAuth(business_admin) → AdminReports
/admin/settings       → RequireAuth(business_admin) → AdminSettings

/staff                → RequireAuth(staff) → StaffDashboard
/staff/appointments   → RequireAuth(staff) → StaffAppointments

/superadmin           → RequireAuth(super_admin) → SuperAdminLayout [nested]
  index               → SuperAdminDashboard
  businesses          → SuperAdminBusinesses
```
**YAPILACAK:** Admin ve Staff route'ları da Layout ile nested yapıya alınmalı (SuperAdmin gibi).

---

## Sonraki Adımlar (Öncelik Sırası)

### 1. Admin Panel (business_admin)
- [ ] Router'ı AdminLayout ile nested yap
- [ ] AdminDashboard: plan kullanımı + bugünün randevuları
- [ ] AdminStaffPage: personel listesi, ekleme/silme, çalışma saatleri modal
- [ ] AdminServicesPage: hizmet listesi, ekleme/düzenleme
- [ ] AdminAppointmentsPage: randevu listesi, onay/ret
- [ ] AdminSettingsPage: işletme profili düzenleme
- [ ] AdminReportsPage: recharts grafikleri
- **Super Admin'de işletme OLUŞTURMA formu ekle** (şu an sadece liste var)

### 2. Staff Panel
- [ ] StaffDashboard: günün randevuları
- [ ] StaffAppointmentsPage: haftalık görünüm

### 3. Public Storefront & Booking
- [ ] StorefrontPage: vitrin (logo, hizmetler, personel, randevu al butonu)
- [ ] BookingPage: hizmet → personel → slot seçimi → form → onay
- [ ] AppointmentActionPage: token ile iptal/erteleme

### 4. Super Admin Eksikleri
- [ ] İşletme oluşturma modal (business admin kullanıcısını da yaratmalı)
- [ ] Support tickets sayfası

---

## Teknik Kararlar & Notlar

### TypeORM Entity Kuralı
`nullable: true` olan tüm `string | null` alanlarda `type: 'varchar'` explicit yazılmalı.
Aksi halde TypeORM "DataType Object not supported" hatası verir.

### Migration & Seed (Docker'da)
```bash
# Migration çalıştır
docker compose exec backend npm run migration:run:prod

# Super admin seed
docker compose exec backend npm run seed:admin:prod
```

### Frontend Rebuild
```bash
docker compose up -d --build frontend
# Sonra tarayıcıda: DevTools → Application → Clear site data → Ctrl+Shift+R
```

### Backend Rebuild
```bash
docker compose up -d --build backend
```

### Tüm Servisler
```bash
docker compose up -d --build --force-recreate
```

---

## Dosya Yapısı Özeti
```
multiagent-randevu-app/
├── .env                          # Tüm secret'lar burada
├── docker-compose.yml
├── nginx/nginx.conf              # Reverse proxy config
├── backend/
│   ├── Dockerfile                # npm install (ci değil)
│   ├── src/
│   │   ├── main.ts               # helmet, cors, cookie-parser, ValidationPipe
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── database.module.ts
│   │   │   ├── database.config.ts  # CLI için DataSource
│   │   │   └── redis.module.ts
│   │   ├── database/
│   │   │   ├── entities/         # 11 entity
│   │   │   ├── migrations/       # InitialSchema
│   │   │   └── run-migrations.ts # prod migration runner
│   │   ├── seeds/
│   │   │   └── admin.seed.prod.ts # prod seed
│   │   ├── auth/
│   │   ├── businesses/
│   │   ├── staff/
│   │   ├── services/
│   │   ├── availability/
│   │   ├── appointments/
│   │   ├── notifications/
│   │   │   └── sms/sms.service.ts # İletimerkezi GET API
│   │   ├── reports/
│   │   └── admin/
└── frontend/
    ├── Dockerfile                # npm install (ci değil)
    ├── nginx.conf                # /api proxy + SPA fallback
    ├── postcss.config.js         # ZORUNLU — Tailwind çalışmaz
    ├── tailwind.config.js
    ├── vite.config.ts            # SW devOptions.enabled: false
    └── src/
        ├── app/router.tsx
        ├── store/auth.store.ts
        ├── services/api.ts       # axios + token interceptor
        ├── components/shared/
        │   ├── SuperAdminLayout.tsx ✅
        │   └── AdminLayout.tsx   ✅ (router'a eklenmedi)
        └── pages/
            ├── public/LoginPage.tsx ✅
            ├── superadmin/       ✅ tamamlandı
            ├── admin/            ⏳ placeholder
            ├── staff/            ⏳ placeholder
            └── public/           ⏳ placeholder (storefront/booking)
```
