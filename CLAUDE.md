# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

Multi-tenant SaaS appointment booking platform for service businesses (barber, nail art, car wash, etc.) targeting global markets. Customers book without registration. Staff/admin manage through role-gated panels. Supports 4 UI languages (TR/EN/DE/RU).

---

## Docker Commands (Primary Workflow)

All development runs inside Docker. There is no local `npm run dev` workflow.

```bash
# Rebuild and restart a single service
docker compose up -d --build backend
docker compose up -d --build frontend

# Full rebuild
docker compose up -d --build --force-recreate

# View logs
docker logs randevu2_backend -f
docker logs randevu2_frontend -f
docker logs randevu2_nginx -f

# Run migrations (after entity/migration changes)
docker compose exec backend npm run migration:run:prod

# Run super admin seed (first time only)
docker compose exec backend npm run seed:admin:prod
```

**After every frontend rebuild:** Open DevTools → Application → Clear site data → hard refresh. PWA service worker caches aggressively.

**Ports:**
- `localhost:8080` — nginx (primary entry point, use this)
- `localhost:3000` — backend direct
- `localhost:5000` — frontend direct

---

## Architecture Overview

```
nginx:8080
  /socket.io/  → backend:3000  (WebSocket, Upgrade header required)
  /api/        → backend:3000
  /uploads/    → local volume
  /            → frontend:80
```

### Backend (NestJS v10)

**Global prefix:** `/api/v1` — all HTTP endpoints start with this.

**Response envelope** (applied by `ResponseFormatInterceptor`):
- Success: `{ success: true, data: ..., meta?: ... }`
- Error: `{ success: false, error: { code, message, path, timestamp } }`
- Frontend always reads `response.data.data` (axios wraps in `data` once, interceptor wraps once more)

**Auth flow:**
- OTP via SMS (İletimerkezi provider) → `POST /auth/send-otp` then `POST /auth/verify-otp`
- Access token (15m) in memory, refresh token (30d) in HttpOnly cookie
- `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` decorator on protected routes
- Three roles: `super_admin`, `business_admin`, `staff`

**Module structure** — each feature is a standalone NestJS module:
- `auth/` — OTP, JWT strategy, ThrottlerGuard registered globally here
- `businesses/` — tenant management, slug-based public lookup, QR generation, plan usage, notification settings, support tickets
- `business-types/` — super admin managed types (barber, nail, etc.) with template services and icon; used in onboarding
- `staff/` — user management within a business, working hours, blocked periods, staff-service skill mapping
- `services/` — bookable services per business, `staff_service` join table
- `availability/` — slot generation using Luxon; respects working hours, blocked periods, existing appointments
- `appointments/` — booking creation (public, throttled 5/min/IP), status transitions, WebSocket broadcast on create; action tokens for cancel/reschedule via SMS link
- `events/` — Socket.io gateway for real-time slot locking and appointment push
- `notifications/` — SMS via İletimerkezi GET API; WhatsApp channel stub (`notifications/whatsapp/`)
- `reports/` — overview + heatmap queries
- `admin/` — super admin: list businesses, stats, change plan, block user, manage support tickets
- `config/` — `DatabaseModule`, `RedisModule` (both `@Global()`)

**Key backend endpoints:**
```
POST /auth/send-otp            — send OTP (phone required)
POST /auth/verify-otp          — verify OTP, returns access token + sets refresh cookie
POST /auth/register            — register new business_admin (name + phone + OTP)
POST /auth/setup-business      — create first business for authenticated user (onboarding step 0)
POST /auth/refresh             — refresh access token from HttpOnly cookie
POST /auth/logout              — clear refresh cookie

GET  /businesses/slug/:slug    — public storefront lookup (no auth)
GET  /businesses/:id/qr        — download QR PNG or SVG (auth: admin/staff)
GET  /businesses/:id/plan-usage
GET  /businesses/:id/notification-settings
PATCH /businesses/:id/notification-settings
POST /businesses/:id/support-tickets

POST  /businesses/:bId/staff              — create staff
GET   /businesses/:bId/staff              — list staff
GET   /businesses/:bId/staff/:id
PATCH /businesses/:bId/staff/:id          — update staff; accepts service_ids[] to set skill mapping
DELETE /businesses/:bId/staff/:id

GET   /staff/:staffId/working-hours       — 7-day array
PATCH /staff/:staffId/working-hours       — upsert all 7 days
POST  /staff/:staffId/blocked-periods
GET   /staff/:staffId/blocked-periods
DELETE /staff/:staffId/blocked-periods/:periodId

GET  /availability?business_id&service_id&staff_id&date

POST  /appointments             — public booking (throttled 5/min/IP)
GET   /appointments             — list (filterable: businessId, staffId, from, to, status, per_page)
GET   /appointments/:id
PATCH /appointments/:id/approve
PATCH /appointments/:id/reject
PATCH /appointments/:id/complete
PATCH /appointments/:id/no-show
PATCH /appointments/:id/cancel
GET   /appointments/action      — resolve action token from SMS link
POST  /appointments/action      — execute action (cancel/reschedule) from SMS link

GET  /business-types            — list types (?active=true for public)
POST /business-types            — super admin create
PATCH /business-types/:id
DELETE /business-types/:id
```

**Business entity key fields:**
- `slug` — unique URL identifier, auto-generated from business name
- `approval_mode` — `auto_approve` | `manual_approve`
- `slot_interval_minutes` — stepping between available slots (default 30)
- `timezone` — IANA tz string (default `Europe/Istanbul`)
- `country` — ISO 3166-1 alpha-2 (`TR`, `DE`, etc.)
- `category_order` — ordered array of service category names (controls display order on storefront)
- `business_type_id` — FK to business_types
- `onboarding_step`, `onboarding_completed`, `onboarding_skipped_steps` — onboarding state
- `subscription_plan` — `free` | `pro` | `business` (default `free`)

**Plan limits (PLAN_LIMITS in `plan-limit.service.ts`):**
- `free`: 50 appts/month, 2 staff, 5 services, no SMS/WhatsApp
- `pro`: 500 appts/month, 10 staff, 50 services, SMS+WhatsApp
- `business`: unlimited everything

**NotificationSettings entity** (`notification_settings` table, 1:1 with business):
- `sms_enabled`, `whatsapp_enabled`, `push_enabled` (booleans)
- `reminder_minutes` — how many minutes before appointment to send reminder (60/120/180/1440/2880)
- The SettingsPage saves per-flag toggles (`sms_on_new`, `sms_on_cancel`, `sms_reminder`) separately from the entity; check current implementation in `update-notification-settings.dto.ts`

**TypeORM notes:**
- Nullable string columns must declare `type: 'varchar'` explicitly — TypeORM throws "DataType Object not supported" without it
- Migrations live in `src/database/migrations/` — generate with `migration:generate`, run in prod with `migration:run:prod`

### WebSocket (EventsGateway)

Socket.io runs on the same port (3000) as HTTP. nginx proxies `/socket.io/` with `Upgrade` header.

Room model: each business gets a room `biz:{businessId}`. All clients (customers + staff) for the same business share one room.

Client flow:
1. Connect → emit `joinBusiness { businessId }` → server validates UUID and DB existence → joins room
2. Emit `slot:lock { businessId, slotUtc, serviceId, durationMinutes }` → Redis SET with 180s TTL → broadcasts `slot:locked` to entire room (including sender, who filters by `lockedBy === socket.id`)
3. On disconnect → server releases all Redis locks owned by that socket

Security hardening in gateway: UUID v4 regex, ISO 8601 UTC regex, rate limit 30 events/min/socket, room-hop prevention, past-slot rejection.

### Frontend (React 18 + Vite + Tailwind)

**API client:** `src/services/api.ts` — Axios instance with baseURL `/api/v1`, Bearer token interceptor, automatic token refresh on 401.

**Auth state:** Zustand store at `src/store/auth.store.ts`. On page load, `initialize()` hits `/auth/refresh` to restore session from HttpOnly cookie. All protected routes use `RequireAuth` component that waits for `isInitialized`.

**Routing:** `src/app/router.tsx` — lazy-loaded pages with chunk-error auto-reload. Three nested layout trees:
- `/admin/*` → `AdminLayout` (role: `business_admin`)
- `/staff/*` → `StaffLayout` (role: `staff`)
- `/superadmin/*` → `SuperAdminLayout` (role: `super_admin`)
- Public routes: `/:slug`, `/:slug/book`, `/appointments/action`, `/login`, `/register`

**Key shared components:**
- `src/components/shared/ApptCard.tsx` — appointment card with accordion detail panel, cancel confirm modal, staff actions (complete/no-show/cancel). Exports `isArchived(appt)` helper.
- `src/components/shared/DatePicker.tsx` — calendar popover using react-day-picker + date-fns. Locale-aware (respects i18n language: tr/en/de/ru). Default placeholder from `t('common.selectDate')`.
- `src/components/shared/PhoneInput.tsx` — country code dropdown + phone number input. Emits E.164 format (`+905551234567`). Country data from `src/data/countries.ts`.
- `src/hooks/useBusinessSocket.ts` — Socket.io hook: connects once per `businessId`, exposes `lockSlot`/`unlockSlot`

**Routing — complete page map:**
```
/login                        → LoginPage (OTP login)
/register                     → RegisterPage (new business_admin)
/:slug                        → StorefrontPage (public business page)
/:slug/book                   → BookingPage (public booking flow)
/appointments/action          → AppointmentActionPage (cancel/reschedule via SMS token)

/admin                        → AdminDashboard
/admin/onboarding             → OnboardingPage
/admin/appointments           → AdminAppointmentsPage
/admin/my-schedule            → AdminMySchedulePage (own working hours + blocked periods)
/admin/staff                  → AdminStaffPage
/admin/services               → AdminServicesPage
/admin/reports                → AdminReportsPage
/admin/settings               → AdminSettingsPage

/staff/appointments           → StaffAppointmentsPage
/staff/hours                  → StaffWorkingHoursPage
/staff/share                  → StaffSharePage (copy booking link + download QR)

/superadmin                   → SuperAdminDashboard
/superadmin/businesses        → SuperAdminBusinessesPage
/superadmin/tickets           → SuperAdminTicketsPage
/superadmin/business-types    → SuperAdminBusinessTypesPage
```

**Onboarding flow** (`/admin/onboarding`, `TOTAL_STEPS = 8`):
- Step 0: Business name (`POST /auth/setup-business`)
- Step 1: Business type (category) — picks from BusinessTypes, seeds template services
- Step 2: Business details (phone, address, description, country, city, timezone)
- Step 3: Services (add/edit/delete services with price and duration)
- Step 4: Staff (add staff members with phone)
- Step 5: Staff skills (which services each staff member can perform — `PATCH /businesses/:id/staff/:staffId` with `service_ids`)
- Step 6: Working hours (per-staff 7-day schedule)
- Step 7: Done
- Steps can be **skipped** and resumed later; `onboarding_skipped_steps[]` tracks which. Banner shown on dashboard until all steps complete.

**i18n system:**
- Library: `react-i18next` + `i18next-browser-languagedetector`
- 4 languages: `tr`, `en`, `de`, `ru`
- Locale files: `frontend/src/locales/{tr,en,de,ru}.json` — all 4 files must stay in sync (same keys)
- Language auto-detected from `localStorage` key `i18nextLng`, then browser `navigator.language`
- Config: `src/app/i18n.ts`, fallback language `en`
- All user-visible strings **must** use `t('key')` — no hardcoded Turkish or English in TSX
- `toLocaleDateString()` calls should pass `i18n.language` (not hardcoded `'tr-TR'`)
- `DatePicker` locale uses `LOCALE_MAP` mapping i18n language → date-fns locale

**Date handling:** Always use local timezone for date strings (not `.toISOString().slice(0,10)` which returns UTC and breaks after midnight in Turkey). Pattern: `localDateStr(d)` using `d.getFullYear()`, `d.getMonth()`, `d.getDate()`.

**Slot availability:** `GET /availability?business_id=&service_id=&staff_id=&date=` returns `{ data: { slots: [{ start_utc, start_local, available }] } }`. Read slots as `slotsData?.data?.slots`.

**isArchived logic** (shared, exported from ApptCard): terminal status OR `end_at < now()`. Used to separate past/upcoming appointments in list views.

---

## Environment Variables

Stored in `.env` at project root (loaded by Docker Compose). Key vars:

```
APP_URL=http://localhost
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/randevu_db
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
ILETIMERKEZI_API_KEY / ILETIMERKEZI_HASH / ILETIMERKEZI_SENDER
```

SMS service requires the server's public IP to be whitelisted in İletimerkezi dashboard.

WhatsApp channel is stubbed in `notifications/whatsapp/whatsapp.service.ts` — not yet wired to a provider.

---

## TypeORM / Migration Pattern

When adding a column to an entity, also create a migration:

```typescript
// backend/src/database/migrations/TIMESTAMP-MigrationName.ts
export class MigrationName implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ... DROP COLUMN IF EXISTS ...`);
  }
}
```

Register in `src/config/database.config.ts` migrations array, then `migration:run:prod` inside the container.

---

## Key Conventions

- **Slot keys in Redis:** `slotlock::{businessId}::{slotUtc}::{serviceId}` — split on `::` (4 parts) to recover components on unlock
- **Staff assignment:** When no `staff_id` provided, `autoAssignStaff()` picks least-busy available staff. Falls back to all active business staff if no `staff_service` mappings exist
- **Availability deduplication:** When no `staff_id`, slots with same `start_utc` are merged; `available: true` wins over `available: false`
- **`slot_interval_minutes`** on Business entity controls the stepping between slots (not the service duration)
- **Approval modes:** `auto_approve` (instant confirm) vs `manual_approve` (pending → admin approves)
- **Appointment action tokens:** Cancel/reschedule links in SMS contain a signed token. `GET /appointments/action?token=` resolves it; `POST /appointments/action` executes. Frontend page: `AppointmentActionPage`.
- **Staff-service skills:** `PATCH /businesses/:bId/staff/:staffId` accepts `service_ids: string[]`. When empty, staff can perform all services. Used in onboarding step 5 and StaffPage blocked-period management.
- **QR code:** `GET /businesses/:id/qr?format=png` — PNG download, auth required (any role of that business). Staff can download from `/staff/share`.
- **Support tickets:** `POST /businesses/:id/support-tickets` — staff/admin send ticket to super admin. Super admin manages via `/superadmin/tickets`.
- **countries data:** `src/data/countries.ts` — array of `{ code, name, dialCode, flag, timezone }`. Used in PhoneInput (dial code) and onboarding Step 2 (country + timezone auto-fill).
