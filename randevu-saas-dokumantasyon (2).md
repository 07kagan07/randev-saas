# 📅 SaaS Randevu Uygulaması — Tam Proje Dokümantasyonu

> **Versiyon:** 1.0.0  
> **Teknoloji Stack:** NestJS · PostgreSQL · Redis · PWA · REST API  
> **Hedef Sektörler:** Berber, Kuaför, Nail Art, Araç Bakım, Araç Yıkama ve benzeri randevu tabanlı işletmeler

---

## İÇİNDEKİLER

1. [Genel Bakış](#1-genel-bakış)
2. [Kullanıcı Rolleri](#2-kullanıcı-rolleri)
3. [Abonelik Planları](#3-abonelik-planları)
4. [Tasarım Prensipleri](#4-tasarım-prensipleri)
5. [Kimlik Doğrulama & Güvenlik](#5-kimlik-doğrulama--güvenlik)
6. [İşletme Yönetimi](#6-işletme-yönetimi)
7. [Personel Yönetimi](#7-personel-yönetimi)
8. [Hizmet Yönetimi](#8-hizmet-yönetimi)
9. [Takvim & Müsaitlik Yönetimi](#9-takvim--müsaitlik-yönetimi)
10. [Randevu Akışı](#10-randevu-akışı)
11. [Bildirim Sistemi](#11-bildirim-sistemi)
12. [Müşteri (Misafir) Deneyimi](#12-müşteri-misafir-deneyimi)
13. [Raporlama & İstatistikler](#13-raporlama--istatistikler)
14. [Super Admin Paneli](#14-super-admin-paneli)
15. [Veritabanı Şeması](#15-veritabanı-şeması)
16. [API Endpoint Listesi](#16-api-endpoint-listesi)
17. [API Response Yapıları](#17-api-response-yapıları)
18. [Hata Yönetimi](#18-hata-yönetimi)
19. [i18n Dil Desteği](#19-i18n-dil-desteği)
20. [Teknik Mimari](#20-teknik-mimari)
21. [Timezone Yönetimi](#21-timezone-yönetimi)
22. [Randevu Çakışma Önleme](#22-randevu-çakışma-önleme-concurrency)
23. [Plan Limiti Aşımı Yönetimi](#23-plan-limiti-aşımı-yönetimi)
24. [Görsel Yükleme Kuralları](#24-görsel-yükleme-kuralları)
25. [.env.example](#25-envexample)

---

## 1. Genel Bakış

SaaS randevu platformu; berberler, kuaförler, nail art atölyeleri, araç bakım ve araç yıkama gibi randevu bazlı çalışan işletmelerin tüm randevu süreçlerini dijitalleştiren çok kiracılı (multi-tenant) bir web uygulamasıdır.

### Temel Özellikler

- İşletmeye özel slug URL ve QR kod ile randevu sayfası
- Misafir (kayıtsız) müşteri randevu akışı — maksimum 3 adım
- Personel bazlı takvim ve müsaitlik yönetimi
- SMS, WhatsApp ve Push Notification bildirimleri
- Tek kullanımlık token ile iptal/erteleme linkleri
- Aylık/yıllık abonelik planları (Free / Pro / Business)
- Türkçe + İngilizce i18n desteği
- Mobil-first, "stupid user" prensibiyle tasarlanmış arayüz

---

## 2. Kullanıcı Rolleri

Sistemde 4 ana kullanıcı rolü bulunur:

| Rol | Açıklama |
|---|---|
| `super_admin` | Platform sahibi. Tüm işletmeleri yönetir. |
| `business_admin` | İşletme sahibi. Kendi işletmesini yönetir. |
| `staff` | Personel. Kendi takvimini ve randevularını görür. |
| `guest` | Kayıtsız müşteri. Yalnızca randevu alır. |

### 2.1 Super Admin Yetkileri
- Tüm işletmeleri listeleme, arama, filtreleme
- Abonelik planı atama ve yönetimi
- Kullanıcı engelleme / hesap silme
- Platform geneli istatistikleri görüntüleme
- Destek taleplerini yönetme

### 2.2 Business Admin Yetkileri
- İşletme profili düzenleme (isim, açıklama, adres, telefon, fotoğraf)
- Personel ekleme, düzenleme, silme
- Hizmet tanımlama ve yönetimi
- Takvim ve müsaitlik ayarları
- Randevuları görüntüleme, onaylama, reddetme
- Raporları görüntüleme
- Bildirim ayarları (hatırlatma zamanı vb.)

### 2.3 Staff (Personel) Yetkileri
- Kendi günlük takvimini görüntüleme
- Kendi randevu detaylarını görme (müşteri adı, hizmet)
- Randevuyu "Tamamlandı" veya "Gelmedi" olarak işaretleme
- Geçici saat aralığı kapatma (anlık veya ileri tarih için)

### 2.4 Guest (Misafir Müşteri) Yetkileri
- Randevu oluşturma (isim + telefon ile, kayıt gerekmez)
- SMS/WhatsApp ile gelen link üzerinden randevu iptali
- SMS/WhatsApp ile gelen link üzerinden randevu erteleme

---

## 3. Abonelik Planları

### 3.1 Plan Tablosu

| Özellik | Free | Pro | Business |
|---|---|---|---|
| Aylık randevu limiti | 50 | 500 | Sınırsız |
| Personel sayısı | 2 | 10 | Sınırsız |
| Hizmet sayısı | 5 | 50 | Sınırsız |
| SMS bildirimi | ✗ | ✓ | ✓ |
| WhatsApp bildirimi | ✗ | ✓ | ✓ |
| Raporlama | Temel | Gelişmiş | Gelişmiş |
| QR Kod | ✓ | ✓ | ✓ |
| Özel slug URL | ✓ | ✓ | ✓ |
| Öncelikli destek | ✗ | ✗ | ✓ |

### 3.2 Abonelik Modeli
- Aylık ve yıllık ödeme seçeneği (yıllıkta indirim)
- Plan yükseltme anlık aktif olur
- Plan düşürme mevcut dönem sonunda geçerli olur
- Free plan süresiz, kısıtlı özelliklerle kullanılabilir

---

## 4. Tasarım Prensipleri

### 4.1 Mobil-First
- Tüm ekranlar önce mobil (320px+) için tasarlanır, sonra büyük ekrana uyarlanır
- Dokunma hedefleri minimum 48x48px
- Swipe ve dokunma odaklı etkileşimler
- Alt navigasyon barı (thumb zone'a uygun)

### 4.2 "Stupid User" Prensibi
Uygulama; teknolojiyle arası iyi olmayan, eğitim seviyesi düşük kullanıcıları hedefler. Bu kural hem işletme hem de müşteri ekranları için geçerlidir.

**Uygulama Kuralları:**
- Randevu alma akışı maksimum 3 adımda tamamlanır
- Ekran başına tek bir ana aksiyon (büyük, belirgin buton)
- Minimum yazı boyutu 16px (body)
- Hata mesajları teknik değil, sade Türkçe/İngilizce olur
  - ❌ `Error 422: Validation failed`
  - ✅ `Lütfen telefon numaranızı eksiksiz girin`
- Her işlem sonrası net onay ekranı gösterilir
  - Örnek: `✅ Randevunuz alındı! 15 Mart Cumartesi, saat 14:00`
- İkonlar her zaman yazıyla birlikte kullanılır
- Geri alma / iptal seçeneği her adımda görünür olur
- Form alanları minimum sayıda tutulur

---

## 5. Kimlik Doğrulama & Güvenlik

### 5.1 JWT Stratejisi
- **Access Token:** 15 dakika geçerli
- **Refresh Token:** 30 gün geçerli, HttpOnly cookie olarak saklanır
- Token yenileme: `POST /auth/refresh`
- Logout: Refresh token Redis blacklist'e alınır

### 5.2 RBAC (Role Based Access Control)
Her endpoint `@Roles()` decorator ile korunur. İstek geldiğinde:
1. JWT doğrulanır
2. Kullanıcı rolü kontrol edilir
3. `business_id` sahiplik kontrolü yapılır

### 5.3 Tek Kullanımlık Randevu Aksiyon Token'ı
Müşteriye gönderilen SMS/WhatsApp mesajlarındaki iptal ve erteleme linkleri için kullanılır.

- Token Redis'te saklanır, TTL: 48 saat
- Kullanıldıktan sonra anında silinir
- Format: `https://platform.com/appointments/action?token=<uuid>`

### 5.4 Rate Limiting

| Endpoint Grubu | Limit |
|---|---|
| `POST /auth/*` | 10 istek / dakika / IP |
| `POST /appointments` | 5 istek / dakika / IP |
| Genel API | 100 istek / dakika / kullanıcı |

---

## 6. İşletme Yönetimi

### 6.1 İşletme Profili Alanları

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | UUID | Birincil anahtar |
| `name` | string | İşletme adı |
| `slug` | string | Benzersiz URL parçası (örn: `berbersahin`) |
| `description` | string | İşletme hakkında açıklama |
| `phone` | string | İletişim telefonu |
| `address` | string | Adres |
| `category` | enum | İşletme kategorisi |
| `logo_url` | string | Profil fotoğrafı |
| `cover_url` | string | Kapak görseli |
| `is_active` | boolean | İşletme aktif/pasif |
| `subscription_plan` | enum | `free` / `pro` / `business` |

### 6.2 İşletme Kategorileri (Enum)

```
barber          → Berber
hair_salon      → Kuaför
nail_art        → Nail Art
car_service     → Araç Bakım
car_wash        → Araç Yıkama
beauty_center   → Güzellik Merkezi
spa             → SPA & Masaj
other           → Diğer
```

### 6.3 Vitrin Sayfası (Public)
Her işletmenin herkese açık randevu sayfası:

- **URL:** `https://platform.com/{slug}`
- **QR Kod:** Admin panelinden PNG/SVG olarak indirilebilir
- Sayfada gösterilenler: İşletme adı, görseller, kategori, adres, telefon, hizmet listesi (fiyat gösterimi `show_price` alanına göre), müsait saatler, randevu formu

---

## 7. Personel Yönetimi

### 7.1 Personel Alanları

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | UUID | Birincil anahtar |
| `business_id` | UUID | İşletme referansı |
| `full_name` | string | Ad soyad |
| `phone` | string | Telefon (login için) |
| `avatar_url` | string | Profil fotoğrafı |
| `is_active` | boolean | Aktif/pasif |
| `services` | array | Yapabildiği hizmetler |
| `working_hours` | object | Haftalık çalışma saatleri |

### 7.2 Personel Takvim Görünümü (Staff Ekranı)
- Günlük görünüm — yalnızca kendi randevuları
- Her randevu kartında: müşteri adı, hizmet adı, başlangıç/bitiş saati
- Randevu durum işaretleme: `completed` (Tamamlandı) / `no_show` (Gelmedi)

### 7.3 Geçici Müsaitlik Kapatma
Personel kendi ekranından belirli bir saat aralığını kapatabilir:

- **Anlık kapatma:** Şu andan itibaren bir bitiş saati seçilir
- **İleri tarih için planlama:** Tarih + başlangıç/bitiş saati seçilerek ileri tarihe eklenir
- Kapatılan aralığa yeni randevu alınamaz
- Bu aralıkta mevcut randevu varsa admin push notification ile bilgilendirilir (randevular otomatik iptal edilmez)

---

## 8. Hizmet Yönetimi

### 8.1 Hizmet Alanları

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | UUID | Birincil anahtar |
| `business_id` | UUID | İşletme referansı |
| `name` | string | Hizmet adı |
| `category` | string | Hizmet kategorisi |
| `duration_minutes` | integer | Süre (dakika) |
| `price` | decimal | Ücret (bilgi amaçlı) |
| `currency` | string | Para birimi (`TRY` / `USD`) |
| `show_price` | boolean | Müşteriye fiyat gösterilsin mi? |
| `is_active` | boolean | Aktif/pasif |
| `staff_ids` | array | Bu hizmeti yapabilen personel ID'leri |

### 8.2 Örnek Hizmet Kategorileri
```
Saç İşlemleri / Tırnak / Cilt Bakımı / Sakal / Araç Yıkama / Araç Bakım / Diğer
```

---

## 9. Takvim & Müsaitlik Yönetimi

### 9.1 Haftalık Çalışma Takvimi
Her personel için tekrarlı haftalık program tanımlanır:

```json
{
  "monday":    { "is_open": true,  "start": "09:00", "end": "18:00" },
  "tuesday":   { "is_open": true,  "start": "09:00", "end": "18:00" },
  "wednesday": { "is_open": true,  "start": "09:00", "end": "18:00" },
  "thursday":  { "is_open": true,  "start": "09:00", "end": "18:00" },
  "friday":    { "is_open": true,  "start": "09:00", "end": "17:00" },
  "saturday":  { "is_open": true,  "start": "10:00", "end": "15:00" },
  "sunday":    { "is_open": false, "start": null,    "end": null    }
}
```

### 9.2 Kapalı Günler
İşletme bazında özel kapalı günler tanımlanabilir (resmi tatiller, izin vb.)

### 9.3 Özel Zaman Dilimleri
Belirli bir günde normal saatlerin dışında çalışma tanımlanabilir:
- Örnek: Normal program 09:00-18:00, ama 20 Mart'ta yalnızca 10:00-13:00
- Bu tanım o güne özel haftalık programı geçersiz kılar

### 9.4 Müsait Slot Hesaplama Mantığı

1. O güne ait çalışma saatleri alınır (özel tanım öncelikli)
2. Kapalı gün kontrolü yapılır
3. Geçici kapatma (blocked_periods) aralıkları çıkarılır
4. Onaylanmış mevcut randevular + süreleri çıkarılır
5. Kalan boşluklar seçilen hizmetin `duration_minutes` değerine göre slotlara bölünür

---

## 10. Randevu Akışı

### 10.1 Randevu Oluşturma — Müşteri Tarafı (3 Adım)

**Adım 1 — Hizmet & Personel Seçimi**
- İşletme vitrin sayfasına girilir (`/{slug}`)
- Hizmet seçilir
- Personel seçilir (veya "Fark etmez" seçeneği ile sistem otomatik atar)

**Adım 2 — Tarih & Saat Seçimi**
- Takvimden gün seçilir
- Müsait saatler listelenir, biri seçilir

**Adım 3 — Bilgi & Onay**
- Ad Soyad girilir
- Telefon numarası girilir
- "Randevumu Al" butonuna basılır
- ✅ Net onay ekranı gösterilir: `Randevunuz alındı! 20 Mart Perşembe, 10:00`

### 10.2 Randevu Onay Modları
İşletme admin panelinden birini seçer:

| Mod | Açıklama |
|---|---|
| `auto_approve` | Randevu anında onaylanır, müşteriye bildirim gider |
| `manual_approve` | Admin/personel onaylayana kadar `pending` durumda bekler |

### 10.3 Randevu Durumları (State Machine)

```
pending     → approved   → completed
pending     → rejected
approved    → cancelled  (müşteri veya admin)
approved    → rescheduled → approved (yeni saat onaylandıktan sonra)
approved    → no_show
```

| Durum | Açıklama |
|---|---|
| `pending` | Onay bekliyor |
| `approved` | Onaylandı |
| `rejected` | Reddedildi (işletme sebep yazabilir) |
| `cancelled` | İptal edildi |
| `rescheduled` | Ertelendi |
| `completed` | Tamamlandı |
| `no_show` | Müşteri gelmedi |

### 10.4 İptal & Erteleme (Müşteri — Token ile)
Müşteri kayıt olmadan SMS/WhatsApp'tan gelen link ile aksiyonunu alır:

- Link: `https://platform.com/appointments/action?token=<uuid>`
- Token tek kullanımlık, 48 saat geçerli
- Sayfada "İptal Et" veya "Ertele" seçenekleri sunulur
- Erteleme için yeni tarih/saat seçilir
- İşlem sonrası net onay mesajı gösterilir

---

## 11. Bildirim Sistemi

### 11.1 Bildirim Kanalları
- **SMS** — İletimerkezi (toplusmsapi.com)
- **WhatsApp** — WhatsApp Business API
- **Push Notification** — Web Push API (PWA service worker)

### 11.2 Bildirim Tetikleyicileri

| Olay | Alıcı | Kanal |
|---|---|---|
| Randevu oluşturuldu (auto_approve) | Müşteri | SMS + WhatsApp |
| Randevu oluşturuldu (manual_approve) | Admin + Staff | Push |
| Randevu onaylandı | Müşteri | SMS + WhatsApp |
| Randevu reddedildi | Müşteri | SMS + WhatsApp |
| Randevu iptal edildi (müşteri) | Admin + Staff | Push |
| Randevu iptal edildi (admin) | Müşteri | SMS + WhatsApp |
| Randevu hatırlatma | Müşteri | SMS + WhatsApp |
| Personel geçici kapatma (mevcut randevu çakışması) | Admin | Push |

### 11.3 Hatırlatma Ayarı
- İşletme admin panelinden hatırlatma zamanını belirler
- Seçenekler: 1 saat önce / 2 saat önce / 3 saat önce / 1 gün önce / 2 gün önce
- Bildirim Redis Bull Queue üzerinden zamanlanır

### 11.4 SMS/WhatsApp Mesaj Şablonları

**Randevu Onay Mesajı:**
```
Merhaba {müşteri_adı},
{işletme_adı} için randevunuz onaylandı ✅
📅 {tarih} - {saat}
💈 {hizmet_adı} ({personel_adı})

İptal veya erteleme için: {aksiyon_linki}
```

**Hatırlatma Mesajı:**
```
Merhaba {müşteri_adı},
Randevunuzu hatırlatırız 🔔
📅 {tarih} - {saat}
📍 {işletme_adı}

İptal veya erteleme için: {aksiyon_linki}
```

**Ret Mesajı:**
```
Merhaba {müşteri_adı},
Maalesef {tarih} - {saat} randevunuz onaylanamadı.
Sebep: {red_sebebi}
Yeni randevu için: {vitrin_linki}
```

---

## 12. Müşteri (Misafir) Deneyimi

### 12.1 Kayıt Gerekliliği Yok
Müşteriler kayıt olmadan randevu alır. Yalnızca **ad soyad** ve **telefon numarası** istenir.

### 12.2 Randevu Takibi
- Randevu onaylandıktan sonra müşteriye SMS/WhatsApp gönderilir
- Mesajda randevu özeti ve tek kullanımlık iptal/erteleme linki bulunur

### 12.3 Tekrar Eden Müşteri Tanıma
- Aynı telefon numarasıyla yapılan randevular sistemde ilişkilendirilir
- Admin panelinde bu geçmiş "müşteri kartı" olarak görüntülenebilir

---

## 13. Raporlama & İstatistikler

### 13.1 Genel Dashboard (Admin Paneli)
- Bugünkü / bu haftaki / bu ayki randevu sayısı
- Toplam müşteri sayısı
- Durum dağılımı özeti

### 13.2 Randevu Raporları
- Randevu sayısı trend grafiği (günlük/haftalık/aylık)
- Durum dağılımı: tamamlandı / iptal / gelmedi
- İptal ve no-show oranı

### 13.3 Hizmet Raporları
- En çok tercih edilen hizmetler (sıralı liste)
- Hizmet bazında tahmini gelir

### 13.4 Yoğunluk Analizi
- En yoğun saatler (ısı haritası)
- En yoğun günler (haftanın günleri bazında karşılaştırma)

### 13.5 Personel Performansı
- Personel bazında tamamlanan randevu sayısı
- Personel bazında "gelmedi" oranı
- Personel bazında tahmini gelir katkısı

### 13.6 Gelir Raporu
- Hizmet ücreti x tamamlanan randevu = tahmini gelir (ödeme takibi değil)
- Filtreler: tarih aralığı, personel, hizmet kategorisi

---

## 14. Super Admin Paneli

### 14.1 İşletme Yönetimi
- Tüm işletmeleri listeleme (arama + filtreleme: plan, kategori, durum)
- İşletme detayını görüntüleme
- İşletmeyi pasife alma / silme
- Abonelik planını manuel değiştirme

### 14.2 Kullanıcı Yönetimi
- Tüm kullanıcıları listeleme
- Kullanıcı engelleme (login yapamaz hale getirme)
- Hesap silme

### 14.3 Platform İstatistikleri
- Toplam işletme sayısı (aktif/pasif dağılımı)
- Toplam randevu sayısı (platform geneli)
- Plan dağılımı (Free/Pro/Business)
- Günlük/aylık büyüme grafikleri

### 14.4 Destek Talebi Yönetimi
- Gelen talepleri listeleme ve filtreleme
- Durum güncelleme: `open` / `in_progress` / `closed`
- İç not ekleme

---

## 15. Veritabanı Şeması

### `businesses`
```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
name                 VARCHAR(255) NOT NULL
slug                 VARCHAR(100) UNIQUE NOT NULL
description          TEXT
phone                VARCHAR(20)
address              TEXT
category             VARCHAR(50)
logo_url             TEXT
cover_url            TEXT
is_active            BOOLEAN DEFAULT true
subscription_plan    VARCHAR(20) DEFAULT 'free'
subscription_ends_at TIMESTAMPTZ
timezone             VARCHAR(60) NOT NULL DEFAULT 'Europe/Istanbul'  -- IANA timezone adı
created_at           TIMESTAMPTZ DEFAULT NOW()
updated_at           TIMESTAMPTZ DEFAULT NOW()
```

### `users`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE
full_name     VARCHAR(255)
phone         VARCHAR(20) UNIQUE NOT NULL
role          VARCHAR(20) NOT NULL  -- super_admin | business_admin | staff
is_active     BOOLEAN DEFAULT true
avatar_url    TEXT
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

### `services`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE
name              VARCHAR(255) NOT NULL
category          VARCHAR(100)
duration_minutes  INTEGER NOT NULL
price             DECIMAL(10,2)
currency          VARCHAR(3) DEFAULT 'TRY'
show_price        BOOLEAN DEFAULT true
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ DEFAULT NOW()
```

### `staff_services`
```sql
staff_id    UUID REFERENCES users(id) ON DELETE CASCADE
service_id  UUID REFERENCES services(id) ON DELETE CASCADE
PRIMARY KEY (staff_id, service_id)
```

### `working_hours`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
staff_id     UUID REFERENCES users(id) ON DELETE CASCADE
day_of_week  SMALLINT NOT NULL  -- 0=Pzt, 1=Sal, 2=Çar, 3=Per, 4=Cum, 5=Cmt, 6=Paz
is_open      BOOLEAN NOT NULL DEFAULT true
start_time   TIME
end_time     TIME
UNIQUE (staff_id, day_of_week)
```

### `blocked_periods`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
staff_id      UUID REFERENCES users(id) ON DELETE CASCADE
business_id   UUID REFERENCES businesses(id)
start_at      TIMESTAMPTZ NOT NULL
end_at        TIMESTAMPTZ NOT NULL
reason        TEXT
created_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT NOW()
```

### `appointments`
```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id             UUID REFERENCES businesses(id)
staff_id                UUID REFERENCES users(id)
service_id              UUID REFERENCES services(id)
customer_name           VARCHAR(255) NOT NULL
customer_phone          VARCHAR(20) NOT NULL
start_at                TIMESTAMPTZ NOT NULL
end_at                  TIMESTAMPTZ NOT NULL
status                  VARCHAR(20) DEFAULT 'pending'
rejection_reason        TEXT
action_token            UUID UNIQUE
action_token_used       BOOLEAN DEFAULT false
action_token_expires_at TIMESTAMPTZ
notes                   TEXT
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

### `notification_settings`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id       UUID REFERENCES businesses(id) UNIQUE
reminder_minutes  INTEGER DEFAULT 60
sms_enabled       BOOLEAN DEFAULT true
whatsapp_enabled  BOOLEAN DEFAULT true
push_enabled      BOOLEAN DEFAULT true
```

### `support_tickets`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id  UUID REFERENCES businesses(id)
subject      VARCHAR(255)
message      TEXT
status       VARCHAR(20) DEFAULT 'open'
admin_note   TEXT
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

### `appointment_logs`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE
changed_by      UUID REFERENCES users(id)  -- NULL ise müşteri (guest) tarafından yapıldı
from_status     VARCHAR(20)
to_status       VARCHAR(20) NOT NULL
note            TEXT        -- red sebebi, iptal açıklaması vb.
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Veritabanı Index Tanımları
```sql
-- Randevu sorgularında sık kullanılan kombinasyonlar
CREATE INDEX idx_appointments_business_status    ON appointments(business_id, status);
CREATE INDEX idx_appointments_staff_start        ON appointments(staff_id, start_at);
CREATE INDEX idx_appointments_business_start     ON appointments(business_id, start_at);
CREATE INDEX idx_appointments_action_token       ON appointments(action_token) WHERE action_token IS NOT NULL;
CREATE INDEX idx_appointments_customer_phone     ON appointments(customer_phone);

-- Takvim ve müsaitlik sorguları
CREATE INDEX idx_blocked_periods_staff_range     ON blocked_periods(staff_id, start_at, end_at);
CREATE INDEX idx_working_hours_staff             ON working_hours(staff_id);

-- İşletme ve kullanıcı aramaları
CREATE INDEX idx_businesses_slug                 ON businesses(slug);
CREATE INDEX idx_businesses_category             ON businesses(category);
CREATE INDEX idx_users_business_role             ON users(business_id, role);

-- Log geçmişi
CREATE INDEX idx_appointment_logs_appointment    ON appointment_logs(appointment_id);
```

---

## 16. API Endpoint Listesi

Tüm endpointler `/api/v1` prefix'i ile başlar.

### Auth
```
POST   /auth/send-otp          → OTP gönder (SMS ile)
POST   /auth/verify-otp        → OTP doğrula, JWT döner
POST   /auth/refresh            → Access token yenile
POST   /auth/logout             → Logout (refresh token geçersiz kıl)
```

### Businesses
```
POST   /businesses                      → İşletme oluştur              [super_admin]
GET    /businesses                      → İşletmeleri listele           [super_admin]
GET    /businesses/:id                  → İşletme detayı               [business_admin, super_admin]
PATCH  /businesses/:id                  → İşletme güncelle             [business_admin]
DELETE /businesses/:id                  → İşletme sil                  [super_admin]
GET    /businesses/slug/:slug           → Vitrin sayfası verisi        [public]
GET    /businesses/:id/qr               → QR kod indir (PNG/SVG)       [business_admin]
```

### Staff
```
POST   /businesses/:id/staff            → Personel ekle                [business_admin]
GET    /businesses/:id/staff            → Personel listesi             [business_admin]
GET    /businesses/:id/staff/:staffId   → Personel detayı              [business_admin, staff]
PATCH  /businesses/:id/staff/:staffId   → Personel güncelle            [business_admin]
DELETE /businesses/:id/staff/:staffId   → Personel sil                 [business_admin]
```

### Working Hours & Blocked Periods
```
PUT    /staff/:staffId/working-hours               → Haftalık program kaydet    [business_admin, staff]
GET    /staff/:staffId/working-hours               → Haftalık program getir     [business_admin, staff]
POST   /staff/:staffId/blocked-periods             → Geçici kapatma ekle        [business_admin, staff]
GET    /staff/:staffId/blocked-periods             → Kapatmaları listele        [business_admin, staff]
DELETE /staff/:staffId/blocked-periods/:id         → Kapatma sil               [business_admin, staff]
```

### Services
```
POST   /businesses/:id/services          → Hizmet ekle                  [business_admin]
GET    /businesses/:id/services          → Hizmet listesi               [public]
PATCH  /businesses/:id/services/:sid     → Hizmet güncelle              [business_admin]
DELETE /businesses/:id/services/:sid     → Hizmet sil                   [business_admin]
```

### Availability
```
GET    /availability
       ?business_id=&service_id=&staff_id=&date=   → Müsait slotlar    [public]
```

### Appointments
```
POST   /appointments                     → Randevu oluştur              [public/guest]
GET    /appointments                     → Randevu listesi              [business_admin, staff]
GET    /appointments/:id                 → Randevu detayı               [business_admin, staff]
PATCH  /appointments/:id/approve         → Randevuyu onayla             [business_admin]
PATCH  /appointments/:id/reject          → Randevuyu reddet             [business_admin]
PATCH  /appointments/:id/complete        → Tamamlandı işaretle          [staff]
PATCH  /appointments/:id/no-show         → Gelmedi işaretle             [staff]
POST   /appointments/action              → İptal/Ertele (token ile)     [public/guest]
```

### Reports
```
GET    /businesses/:id/reports/overview        → Genel özet dashboard
GET    /businesses/:id/reports/appointments    → Randevu raporu
GET    /businesses/:id/reports/services        → Hizmet raporu
GET    /businesses/:id/reports/staff           → Personel performansı
GET    /businesses/:id/reports/revenue         → Gelir raporu
GET    /businesses/:id/reports/heatmap         → Yoğunluk haritası
```

### Notification Settings
```
GET    /businesses/:id/notification-settings   → Bildirim ayarlarını getir
PUT    /businesses/:id/notification-settings   → Bildirim ayarlarını güncelle
```

### Super Admin
```
GET    /admin/businesses                → Tüm işletmeler
GET    /admin/stats                     → Platform istatistikleri
PATCH  /admin/businesses/:id/plan       → Plan değiştir
POST   /admin/users/:id/block           → Kullanıcı engelle
DELETE /admin/users/:id                 → Kullanıcı sil
GET    /admin/support-tickets           → Destek talepleri
PATCH  /admin/support-tickets/:id       → Talep güncelle
```

---

## 17. API Response Yapıları

Tüm API yanıtları aşağıdaki zarflama yapısını kullanır:

### 17.1 Başarılı Tekil Yanıt
```json
{
  "success": true,
  "data": { }
}
```

### 17.2 Başarılı Liste Yanıtı (Sayfalandırmalı)
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### 17.3 Hata Yanıtı
```json
{
  "success": false,
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "Bu saat dilimi dolu, lütfen başka bir saat seçin.",
    "message_en": "This time slot is already taken.",
    "details": {}
  }
}
```

---

### 17.4 Business Nesnesi
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Berber Şahin",
  "slug": "berbersahin",
  "description": "Profesyonel erkek kuaförü",
  "phone": "+905551234567",
  "address": "Kadıköy, İstanbul",
  "category": "barber",
  "logo_url": "https://cdn.example.com/logos/berbersahin.jpg",
  "cover_url": "https://cdn.example.com/covers/berbersahin.jpg",
  "is_active": true,
  "subscription_plan": "pro",
  "subscription_ends_at": "2025-12-31T23:59:59Z",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### 17.5 Staff Nesnesi
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "business_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Ahmet Yılmaz",
  "phone": "+905559876543",
  "avatar_url": "https://cdn.example.com/avatars/ahmet.jpg",
  "role": "staff",
  "is_active": true,
  "services": [
    { "id": "uuid", "name": "Saç Kesimi", "duration_minutes": 30 },
    { "id": "uuid", "name": "Sakal Tıraşı", "duration_minutes": 20 }
  ],
  "working_hours": {
    "monday":    { "is_open": true,  "start": "09:00", "end": "18:00" },
    "tuesday":   { "is_open": true,  "start": "09:00", "end": "18:00" },
    "wednesday": { "is_open": true,  "start": "09:00", "end": "18:00" },
    "thursday":  { "is_open": true,  "start": "09:00", "end": "18:00" },
    "friday":    { "is_open": true,  "start": "09:00", "end": "17:00" },
    "saturday":  { "is_open": true,  "start": "10:00", "end": "15:00" },
    "sunday":    { "is_open": false, "start": null,    "end": null    }
  },
  "created_at": "2024-01-20T08:00:00Z"
}
```

### 17.6 Service Nesnesi
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "business_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Saç Kesimi",
  "category": "Saç İşlemleri",
  "duration_minutes": 30,
  "price": 150.00,
  "currency": "TRY",
  "show_price": true,
  "is_active": true,
  "staff": [
    { "id": "uuid", "full_name": "Ahmet Yılmaz" },
    { "id": "uuid", "full_name": "Mehmet Kaya" }
  ],
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 17.7 Availability Response
```json
{
  "success": true,
  "data": {
    "date": "2025-03-20",
    "staff": {
      "id": "uuid",
      "full_name": "Ahmet Yılmaz",
      "avatar_url": "https://cdn.example.com/avatars/ahmet.jpg"
    },
    "service": {
      "id": "uuid",
      "name": "Saç Kesimi",
      "duration_minutes": 30
    },
    "slots": [
      { "start": "09:00", "end": "09:30", "available": true  },
      { "start": "09:30", "end": "10:00", "available": false },
      { "start": "10:00", "end": "10:30", "available": true  },
      { "start": "10:30", "end": "11:00", "available": true  },
      { "start": "11:00", "end": "11:30", "available": false }
    ]
  }
}
```

### 17.8 Appointment Nesnesi
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "business_id": "uuid",
  "business_name": "Berber Şahin",
  "staff": {
    "id": "uuid",
    "full_name": "Ahmet Yılmaz",
    "avatar_url": "https://cdn.example.com/avatars/ahmet.jpg"
  },
  "service": {
    "id": "uuid",
    "name": "Saç Kesimi",
    "duration_minutes": 30,
    "price": 150.00,
    "currency": "TRY"
  },
  "customer_name": "Mehmet Demir",
  "customer_phone": "+905551112233",
  "start_at": "2025-03-20T10:00:00Z",
  "end_at": "2025-03-20T10:30:00Z",
  "status": "approved",
  "rejection_reason": null,
  "notes": null,
  "created_at": "2025-03-18T14:22:00Z",
  "updated_at": "2025-03-18T14:25:00Z"
}
```

### 17.9 Blocked Period Nesnesi
```json
{
  "id": "uuid",
  "staff_id": "uuid",
  "business_id": "uuid",
  "start_at": "2025-03-20T13:00:00Z",
  "end_at": "2025-03-20T15:00:00Z",
  "reason": "Banka",
  "created_by": "uuid",
  "created_at": "2025-03-20T12:55:00Z"
}
```

### 17.10 Appointment Action Request & Response

**İptal Request:**
```json
POST /api/v1/appointments/action
{
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "action": "cancel"
}
```

**Erteleme Request:**
```json
POST /api/v1/appointments/action
{
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "action": "reschedule",
  "reschedule_date": "2025-03-22",
  "reschedule_time": "11:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": "uuid",
    "action": "cancelled",
    "message": "Randevunuz başarıyla iptal edildi.",
    "message_en": "Your appointment has been successfully cancelled."
  }
}
```

### 17.11 Report — Overview Response
```json
{
  "success": true,
  "data": {
    "period": "2025-03",
    "total_appointments": 312,
    "completed": 280,
    "cancelled": 20,
    "no_show": 12,
    "completion_rate": 89.7,
    "estimated_revenue": 42000.00,
    "currency": "TRY",
    "top_services": [
      { "name": "Saç Kesimi",   "count": 120 },
      { "name": "Sakal Tıraşı", "count": 95  }
    ],
    "peak_hours": [
      { "hour": "10:00", "count": 45 },
      { "hour": "14:00", "count": 52 }
    ],
    "peak_days": [
      { "day": "saturday", "count": 68 },
      { "day": "friday",   "count": 55 }
    ],
    "staff_performance": [
      {
        "staff_id": "uuid",
        "full_name": "Ahmet Yılmaz",
        "completed": 145,
        "no_show": 5,
        "estimated_revenue": 21750.00
      }
    ]
  }
}
```

### 17.12 Notification Settings Nesnesi
```json
{
  "id": "uuid",
  "business_id": "uuid",
  "reminder_minutes": 60,
  "sms_enabled": true,
  "whatsapp_enabled": true,
  "push_enabled": true
}
```

---

## 18. Hata Yönetimi

### 18.1 HTTP Durum Kodları

| Kod | Kullanım |
|---|---|
| `200` | Başarılı GET / PATCH |
| `201` | Başarılı POST (kayıt oluşturuldu) |
| `400` | Geçersiz istek |
| `401` | Kimlik doğrulama başarısız |
| `403` | Yetkisiz erişim |
| `404` | Kayıt bulunamadı |
| `409` | Çakışma (örn: slot dolu) |
| `422` | Validasyon hatası |
| `429` | Rate limit aşıldı |
| `500` | Sunucu hatası |

### 18.2 Özel Hata Kodları

| Kod | Açıklama |
|---|---|
| `SLOT_NOT_AVAILABLE` | Seçilen saat müsait değil |
| `BUSINESS_CLOSED` | İşletme o gün kapalı |
| `STAFF_UNAVAILABLE` | Personel o saatte müsait değil |
| `TOKEN_INVALID` | Aksiyon token geçersiz veya kullanılmış |
| `TOKEN_EXPIRED` | Aksiyon token süresi dolmuş |
| `PLAN_LIMIT_REACHED` | Abonelik planı limiti doldu |
| `BUSINESS_NOT_FOUND` | İşletme bulunamadı |
| `STAFF_NOT_FOUND` | Personel bulunamadı |
| `SERVICE_NOT_FOUND` | Hizmet bulunamadı |
| `OTP_INVALID` | OTP kodu hatalı |
| `OTP_EXPIRED` | OTP süresi dolmuş |
| `USER_BLOCKED` | Kullanıcı engellendi |

---

## 19. i18n Dil Desteği

- **Desteklenen diller:** `tr` (Türkçe — varsayılan), `en` (İngilizce)
- **Dil belirleme sırası:** `Accept-Language` header → `?lang=` query parametresi → varsayılan `tr`
- API hata mesajları her iki dilde döner (`message` + `message_en`)
- SMS/WhatsApp bildirimleri için dil, müşteri telefon numarası ülke koduna göre belirlenir
- Frontend: `i18next` kütüphanesi ile yönetilir
- Tarih/saat formatları locale'e göre gösterilir (`tr-TR` / `en-US`)

---

## 20. Teknik Mimari

### 20.1 Stack Özeti

| Katman | Teknoloji |
|---|---|
| Backend Framework | NestJS (Node.js / TypeScript) |
| API Standardı | REST API, JSON |
| Ana Veritabanı | PostgreSQL |
| Cache & Queue | Redis + Bull |
| Frontend | PWA (React + Vite) |

| WhatsApp | WhatsApp Business API |
| Push Notification | Web Push API (service worker) |
| Dosya Depolama | Local Server (v1) → AWS S3 / Cloudflare R2 (ileride) |
| Kimlik Doğrulama | JWT (Access + Refresh Token) |
| ORM | TypeORM veya Prisma |

### 20.6 Frontend Yapısı (React + Vite + PWA)

| Katman | Teknoloji |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| PWA | vite-plugin-pwa (Workbox) |
| Routing | React Router v6 |
| State Yönetimi | Zustand veya TanStack Query |
| HTTP Client | Axios |
| UI | Tailwind CSS |
| Form | React Hook Form + Zod |
| i18n | i18next + react-i18next |
| Bildirim (Push) | Web Push API (service worker) |

**Vite PWA Konfigürasyonu:**
- `manifest.json`: Uygulama adı, ikon, tema rengi, `display: standalone`
- Service Worker: Offline cache, push notification dinleyici
- `registerSW`: Güncelleme bildirimi

**Proje Klasör Yapısı:**
```
src/
├── app/              (router, providers)
├── pages/
│   ├── public/       (vitrin, randevu alma)
│   ├── admin/        (business admin paneli)
│   ├── staff/        (personel ekranları)
│   └── superadmin/   (platform yönetimi)
├── components/
│   ├── ui/           (buton, input, modal vb. atomlar)
│   └── shared/       (AppointmentCard, StaffSelector vb.)
├── hooks/            (useAppointments, useAvailability vb.)
├── services/         (api.ts, auth.service.ts vb.)
├── store/            (Zustand store'ları)
├── locales/          (tr.json, en.json)
└── utils/
```

### 20.2 Modüler NestJS Yapısı

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/       (jwt.strategy.ts)
├── businesses/
├── staff/
├── services/
├── appointments/
├── availability/
├── notifications/
│   ├── sms/
│   ├── whatsapp/
│   └── push/
├── reports/
├── admin/
├── common/
│   ├── guards/           (jwt-auth.guard.ts, roles.guard.ts)
│   ├── decorators/       (roles.decorator.ts, current-user.decorator.ts)
│   ├── filters/          (http-exception.filter.ts)
│   ├── interceptors/     (response-format.interceptor.ts)
│   └── pipes/            (validation.pipe.ts)
└── config/
    ├── database.config.ts
    └── redis.config.ts
```

### 20.3 Queue Mimarisi (Redis Bull)

| Queue Adı | Görev |
|---|---|
| `notification-queue` | SMS, WhatsApp, Push gönderimi |
| `reminder-queue` | Zamanlanmış randevu hatırlatmaları |
| `cleanup-queue` | Süresi dolmuş token temizleme |

### 20.4 Multi-Tenant Yaklaşımı
- Tek veritabanı (shared schema), tüm tablolarda `business_id` foreign key
- Her API isteğinde `business_id` sahiplik doğrulaması middleware ile yapılır
- Super admin tüm `business_id`'lere erişebilir, diğer roller yalnızca kendi işletmelerine


```
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ILETIMERKEZI_API_KEY=
ILETIMERKEZI_SENDER=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
# Dosya Depolama — v1: Local server (/uploads klasörü, Nginx ile serve edilir)
# İleride ihtiyaç duyulursa S3 uyumlu bir servise taşınır, kod değişikliği minimal olur
UPLOAD_DRIVER=local        # local | s3
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_BASE_URL=https://platform.com/uploads
# S3_BUCKET_NAME=          # ileride aktif edilecek
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
APP_URL=https://platform.com
```

---

  
*Oluşturulma tarihi: Mart 2026*

### 20.5 Ortam Değişkenleri (.env)

```
# Uygulama
APP_URL=https://platform.com
NODE_ENV=production

# Veritabanı
DATABASE_URL=postgresql://postgres:password@db:5432/randevu_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# SMS — İletimerkezi
ILETIMERKEZI_API_KEY=
ILETIMERKEZI_SENDER=

# WhatsApp Business API
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Dosya Depolama — v1: Local server (/uploads klasörü, Nginx ile serve edilir)
# İleride ihtiyaç duyulursa S3 uyumlu bir servise taşınır, kod değişikliği minimal olur
UPLOAD_DRIVER=local        # local | s3
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_BASE_URL=https://platform.com/uploads
# S3_BUCKET_NAME=          # ileride aktif edilecek
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
```

### 20.6 Docker Compose Yapısı

Tüm servisler tek komutla (`docker compose up -d`) ayağa kalkar.

**Servisler:**

| Servis | Açıklama | Port |
|---|---|---|
| `db` | PostgreSQL 16 | 5432 |
| `redis` | Redis 7 | 6379 |
| `backend` | NestJS API | 3000 |
| `frontend` | React + Vite (Nginx) | 80 / 443 |
| `nginx` | Reverse proxy | 80 / 443 |

**docker-compose.yml:**
```yaml
version: '3.9'

services:

  db:
    image: postgres:16-alpine
    container_name: randevu_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: randevu_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - randevu_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: randevu_redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - randevu_net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: randevu_backend
    restart: unless-stopped
    env_file: .env
    volumes:
      - uploads_data:/app/uploads
    networks:
      - randevu_net
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: randevu_frontend
    restart: unless-stopped
    networks:
      - randevu_net
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: randevu_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - uploads_data:/var/www/uploads:ro
    networks:
      - randevu_net
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
  uploads_data:

networks:
  randevu_net:
    driver: bridge
```

**backend/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**nginx/nginx.conf (Reverse Proxy):**
```nginx
server {
    listen 80;
    server_name platform.com;

    # Frontend (React PWA)
    location / {
        proxy_pass http://frontend:80;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Statik görseller (local upload)
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

**Proje Klasör Yapısı:**
```
/
├── backend/
│   ├── Dockerfile
│   ├── src/
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   └── ...
├── nginx/
│   ├── nginx.conf
│   └── certs/
├── docker-compose.yml
└── .env
```

**Kullanım:**
```bash
# İlk kurulum
cp .env.example .env   # .env dosyasını doldur
docker compose up -d   # tüm servisleri ayağa kaldır

# Migration çalıştır (ilk kurulumda)
docker compose exec backend npm run migration:run

# Logları izle
docker compose logs -f backend

# Güncelleme
docker compose build
docker compose up -d
```

---


## 21. Timezone Yönetimi

Sistem çok ülkeli işletmeleri destekler. Her işletme kendi bulunduğu şehir/ülkeye ait IANA timezone'u seçer. Tüm zaman hesaplamaları bu timezone'a göre yapılır.

### 21.1 Temel Kural

| Katman | Davranış |
|---|---|
| **Veritabanı** | Tüm tarih/saat değerleri **UTC** olarak saklanır (`TIMESTAMPTZ`) |
| **Backend** | Gelen yerel saati UTC'ye çevirir, UTC'yi yerel saate çevirir |
| **Frontend** | İşletmenin timezone'unu alır, kullanıcıya daima **yerel saat** gösterir |
| **Bildirimler** | Mesajdaki saat bilgisi **işletme timezone'una** göre formatlanır |

### 21.2 İşletme Timezone Seçimi

İşletme kayıt/profil ekranında ülke → şehir seçimi yapılır:

```
Türkiye    → Europe/Istanbul   (UTC+3)
Almanya    → Europe/Berlin     (UTC+1 / yaz saati UTC+2)
Hollanda   → Europe/Amsterdam  (UTC+1 / yaz saati UTC+2)
Fransa     → Europe/Paris      (UTC+1 / yaz saati UTC+2)
İngiltere  → Europe/London     (UTC+0 / yaz saati UTC+1)
ABD Doğu   → America/New_York  (UTC-5 / yaz saati UTC-4)
...
```

`businesses` tablosundaki `timezone` alanı IANA format string olarak saklanır:
```
Europe/Istanbul
Europe/Berlin
America/New_York
```

### 21.3 Slot Hesaplama — Timezone Akışı

Müşteri Hamburg'daki bir berbere randevu alıyor:

```
1. Frontend: İşletmenin timezone'u = "Europe/Berlin"
2. Müşteri takvimde "15 Mart 10:00" seçer
3. Frontend bu saati UTC'ye çevirir:
   → 15 Mart 10:00 Berlin = 15 Mart 09:00 UTC (yaz saati döneminde 08:00 UTC)
4. API'ye UTC olarak gönderilir: "2025-03-15T09:00:00Z"
5. Backend UTC olarak veritabanına yazar
6. Personel takviminde görüntülerken:
   → UTC 09:00 → Berlin local 10:00 olarak gösterilir
```

### 21.4 Çalışma Saatleri ve Timezone

`working_hours` tablosundaki `start_time` / `end_time` alanları **yerel saat** olarak saklanır (timezone bilgisi olmadan, salt TIME tipi).

Slot hesaplama yapılırken backend şu adımları izler:

```
1. İşletmenin timezone'u alınır (örn: "Europe/Berlin")
2. Sorgu yapılan tarih + working_hours saatleri birleştirilir
3. "2025-03-15 09:00 Europe/Berlin" → UTC'ye çevrilir
4. UTC aralığında randevu ve blocked_period çakışması sorgulanır
5. Müsait slotlar hesaplanır, UTC olarak tutulur
6. Response'da hem UTC hem de işletme timezone'undaki yerel saat döner
```

### 21.5 Availability Response — Timezone Bilgisi

```json
{
  "success": true,
  "data": {
    "date": "2025-03-15",
    "timezone": "Europe/Berlin",
    "slots": [
      {
        "start_local": "09:00",
        "end_local":   "09:30",
        "start_utc":   "2025-03-15T08:00:00Z",
        "end_utc":     "2025-03-15T08:30:00Z",
        "available":   true
      },
      {
        "start_local": "09:30",
        "end_local":   "10:00",
        "start_utc":   "2025-03-15T08:30:00Z",
        "end_utc":     "2025-03-15T09:00:00Z",
        "available":   false
      }
    ]
  }
}
```

> Frontend her zaman `start_local` değerini gösterir. `start_utc` backend işlemleri için kullanılır.

### 21.6 Bildirim Mesajlarında Timezone

SMS/WhatsApp mesajlarında gönderilen saat bilgisi işletmenin timezone'una göre formatlanır:

```
Hamburg işletmesi için:
  UTC 08:00 → mesajda "09:00" (Mart ayı, yaz saati öncesi)
  UTC 08:00 → mesajda "10:00" (Haziran ayı, yaz saatinde)

İstanbul işletmesi için:
  UTC 08:00 → mesajda "11:00" (her mevsim UTC+3)
```

Backend'de `luxon` veya `date-fns-tz` kütüphanesi kullanılır:
```typescript
import { DateTime } from 'luxon';

const localTime = DateTime.fromJSDate(appointment.start_at, { zone: 'UTC' })
  .setZone(business.timezone)
  .toFormat('dd MMMM yyyy, HH:mm');
// → "15 Mart 2025, 10:00"
```

### 21.7 Yaz Saati (DST) Yönetimi

- Avrupa'daki işletmeler yaz/kış saati geçişinden etkilenir
- `luxon` kütüphanesi DST geçişlerini otomatik yönetir
- Veritabanında UTC saklandığı için geçiş anında veri bozulması yaşanmaz
- Yaz saati geçiş gecesi (saat 02:00 → 03:00) için o saatteki randevular UTC'de doğru saklanır, yerel gösterim doğru hesaplanır

### 21.8 businesses Tablosuna Eklenen Timezone Alanı

```sql
timezone  VARCHAR(60) NOT NULL DEFAULT 'Europe/Istanbul'
```

İşletme kaydı sırasında zorunlu seçilir. Sonradan değiştirilebilir ancak değişiklik öncesi oluşturulan randevular eski timezone'a göre UTC'ye dönüştürülmüş olduğundan etkilenmez.

---

## 22. Randevu Çakışma Önleme (Concurrency)

Aynı slot'a aynı anda iki müşteri başvurursa yalnızca biri başarılı olmalıdır.

### 22.1 Senaryo

```
T=0ms  Müşteri A → 10:00 slotunu seçti, POST /appointments gönderdi
T=5ms  Müşteri B → 10:00 slotunu seçti, POST /appointments gönderdi
T=10ms Backend A → slot müsait mi? → EVET
T=11ms Backend B → slot müsait mi? → EVET (A henüz yazmadı)
T=20ms Backend A → randevu yazıldı ✅
T=21ms Backend B → randevu yazıldı ✅ ← ÇAKIŞMA!
```

### 22.2 Çözüm: PostgreSQL Advisory Lock + Unique Constraint

**Adım 1 — Unique Constraint (son savunma hattı):**

```sql
-- Aynı personel, aynı başlangıç saatine iki randevu girilemesin
CREATE UNIQUE INDEX idx_appointments_staff_start_unique
  ON appointments(staff_id, start_at)
  WHERE status NOT IN ('cancelled', 'rejected');
```

**Adım 2 — İşlem sırası (NestJS service katmanında):**

```typescript
async createAppointment(dto: CreateAppointmentDto) {
  return this.dataSource.transaction(async (manager) => {

    // 1. Slot için advisory lock al (staff_id bazlı)
    await manager.query(
      `SELECT pg_advisory_xact_lock($1)`,
      [hashCode(dto.staff_id + dto.start_at)]
    );

    // 2. Slot hâlâ müsait mi kontrol et
    const conflict = await manager.findOne(Appointment, {
      where: {
        staff_id: dto.staff_id,
        start_at: dto.start_at,
        status: Not(In(['cancelled', 'rejected']))
      }
    });

    if (conflict) {
      throw new ConflictException('SLOT_NOT_AVAILABLE');
    }

    // 3. Randevuyu oluştur
    return manager.save(Appointment, { ...dto });

  }); // Transaction bitince lock otomatik serbest kalır
}
```

### 22.3 Sonuç

- İlk gelen müşteri lock'u alır, randevuyu oluşturur, lock serbest kalır
- İkinci müşteri lock bekler, transaction tamamlandıktan sonra çakışma tespit eder
- İkinci müşteriye `409 SLOT_NOT_AVAILABLE` hatası döner
- Frontend: `"Bu saat doldu, lütfen başka bir saat seçin."`

---

## 23. Plan Limiti Aşımı Yönetimi

### 23.1 Limit Kontrolü

Her randevu oluşturma isteğinde backend şu kontrolü yapar:

```typescript
async checkPlanLimit(businessId: string) {
  const business = await this.businessRepo.findOne(businessId);
  const plan = PLAN_LIMITS[business.subscription_plan];

  if (plan.monthly_appointments === Infinity) return; // Business plan

  const thisMonthCount = await this.appointmentRepo.count({
    where: {
      business_id: businessId,
      created_at: MoreThanOrEqual(startOfMonth(new Date())),
      status: Not('rejected')
    }
  });

  if (thisMonthCount >= plan.monthly_appointments) {
    throw new ForbiddenException('PLAN_LIMIT_REACHED');
  }
}
```

### 23.2 Plan Limitleri Sabiti

```typescript
export const PLAN_LIMITS = {
  free:     { monthly_appointments: 50,       staff: 2,  services: 5  },
  pro:      { monthly_appointments: 500,      staff: 10, services: 50 },
  business: { monthly_appointments: Infinity, staff: Infinity, services: Infinity },
};
```

### 23.3 Müşteriye Gösterilen Mesaj

Free plan limitine ulaşmış işletmenin vitrin sayfasına girildiğinde:

```json
{
  "success": false,
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "Bu işletme bu ay için randevu kapasitesine ulaştı. Lütfen işletmeyi arayın.",
    "message_en": "This business has reached its monthly appointment limit. Please call the business."
  }
}
```

Admin panelinde limit %80'e ulaşınca uyarı banner'ı gösterilir:
> ⚠️ Bu ay 40/50 randevunuzu kullandınız. Plan yükseltmek için tıklayın.

---

## 24. Görsel Yükleme Kuralları

### 24.1 Desteklenen Format ve Boyutlar

| Görsel Türü | Max Boyut | Formatlar | Önerilen Oran |
|---|---|---|---|
| Logo | 2 MB | JPG, PNG, WEBP | 1:1 (kare) |
| Kapak Görseli | 5 MB | JPG, PNG, WEBP | 16:9 |
| Personel Avatar | 1 MB | JPG, PNG, WEBP | 1:1 (kare) |

### 24.2 Backend İşleme

Görsel yükleme sonrası backend otomatik olarak:

1. Format doğrulaması yapar (magic bytes kontrolü, sadece uzantıya güvenilmez)
2. Boyut kontrolü yapar
3. `sharp` kütüphanesi ile yeniden boyutlandırır:
   - Logo → max 400x400px
   - Kapak → max 1200x675px
   - Avatar → max 200x200px
4. WEBP formatına dönüştürür (daha küçük dosya boyutu)
5. Benzersiz dosya adı üretir: `{uuid}-{timestamp}.webp`
6. `/uploads/{business_id}/{type}/` klasörüne kaydeder

### 24.3 Upload Endpoint

```
POST /api/v1/upload/image
Content-Type: multipart/form-data

Body:
  file: File
  type: "logo" | "cover" | "avatar"
  entity_id: UUID  (business_id veya staff_id)

Response:
{
  "success": true,
  "data": {
    "url": "https://platform.com/uploads/abc123/logo/uuid-timestamp.webp"
  }
}
```

---

## 25. .env.example

Projeyi klonlayan kişi bu dosyayı `.env` olarak kopyalar ve değerleri doldurur:

```bash
# ==============================================
# UYGULAMA
# ==============================================
APP_URL=https://platform.com
NODE_ENV=production          # development | production

# ==============================================
# VERİTABANI
# ==============================================
DB_PASSWORD=change_me_strong_password
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/randevu_db

# ==============================================
# REDIS
# ==============================================
REDIS_URL=redis://redis:6379

# ==============================================
# JWT
# ==============================================
JWT_ACCESS_SECRET=change_me_random_32_chars
JWT_REFRESH_SECRET=change_me_another_random_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ==============================================
# SMS — İletimerkezi (toplusmsapi.com)
# ==============================================
ILETIMERKEZI_API_KEY=
ILETIMERKEZI_SENDER=        # Onaylı başlık (örn: BERBERIM)

# ==============================================
# WHATSAPP BUSINESS API
# ==============================================
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# ==============================================
# DOSYA DEPOLAMA
# v1: local — görseller sunucuda tutulur
# İleride s3'e geçmek için UPLOAD_DRIVER=s3 yap
# ==============================================
UPLOAD_DRIVER=local
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_BASE_URL=https://platform.com/uploads
# S3_BUCKET_NAME=
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
```

---

*Döküman Sonu — v1.0.0*
*Oluşturulma tarihi: Mart 2026*
