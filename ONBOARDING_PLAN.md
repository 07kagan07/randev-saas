# Onboarding Wizard — Uygulama Planı

## Genel Bakış

Yeni kayıt olan her işletme, `onboarding_completed = false` statüsüyle başlar.
Admin paneline ilk girişte wizard otomatik açılır. Yarıda bırakılsa bile
tamamlanan adımlar kaydedilir; dashboard'da "Kurulumu Tamamla" banner'ı gösterilir.

---

## Adımlar

| # | Adım | Endpoint | Atlanabilir mi? |
|---|------|----------|-----------------|
| 1 | **İşletme Tipi** | `PATCH /businesses/:id` (`category`) | Hayır |
| 2 | **İşletme Bilgileri** | `PATCH /businesses/:id` (`phone`, `address`, `description`) | Evet |
| 3 | **Hizmetler** | `POST /businesses/:id/services` (bulk) | Evet |
| 4 | **Personel** | İşletme sahibi çalışıyor mu? `POST /businesses/:id/staff` | Evet |
| 5 | **Çalışma Saatleri** | `PATCH /staff/:id/working-hours` | Evet |
| 6 | **Tamamlandı** | `PATCH /businesses/:id` (`onboarding_completed: true`) | — |

---

## Backend Değişiklikleri

### 1. Business Entity — Yeni Alan
```ts
// business.entity.ts
@Column({ default: false })
onboarding_completed: boolean;
```

### 2. Migration
```sql
ALTER TABLE businesses ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
```

### 3. UpdateBusinessDto — Alan Ekleme
```ts
// update-business.dto.ts
@IsOptional()
@IsBoolean()
onboarding_completed?: boolean;
```

### 4. BusinessesService.update() — Zaten var, ek değişiklik gerekmez

### 5. Auth Login Response — `onboarding_completed` döndür
JWT payload'a veya `/auth/me` response'una `onboarding_completed` eklenmeli.
Böylece frontend nereye yönlendireceğini bilir.

---

## Frontend Değişiklikleri

### Dosya Yapısı
```
frontend/src/
  pages/admin/onboarding/
    OnboardingPage.tsx          ← Ana wrapper (adım yönetimi, progress bar)
    steps/
      Step1Category.tsx         ← İşletme tipi seçimi
      Step2BusinessInfo.tsx     ← İletişim / adres bilgileri
      Step3Services.tsx         ← Hizmet seçimi / düzenleme
      Step4Staff.tsx            ← Personel ekleme
      Step5Hours.tsx            ← Çalışma saatleri
      Step6Done.tsx             ← Tebrik ekranı
  components/shared/
    OnboardingBanner.tsx        ← Dashboard'daki "Kurulumu Tamamla" uyarısı
```

### Router Değişiklikleri
```ts
// router.tsx — admin children'a eklenir
{ path: 'onboarding', element: S(AdminOnboarding) }
```

### Auth Store Değişiklikleri
```ts
// auth.store.ts — user tipine alan eklenir
interface User {
  ...
  onboarding_completed: boolean;
}
```

### Login Sonrası Yönlendirme
```ts
// LoginPage.tsx
if (role === 'business_admin') {
  if (!onboarding_completed) navigate('/admin/onboarding');
  else navigate('/admin');
}
```

### OnboardingPage.tsx — Çekirdek Mantık
- `currentStep` state'i `localStorage`'a kaydedilir (tarayıcı kapansa bile kaldığı yerden devam)
- Her adım "İleri" butonuna basınca API çağrısı yapar, başarılıysa `currentStep++`
- "Atla" butonu sadece atlanabilir adımlarda gösterilir, API çağrısı yapmadan ilerler
- Progress bar üstte gösterilir (6 adım / aktif adım)
- Adımlar arasında geri dönülebilir (önceki adımlara tıklanabilir)

---

## Hizmet Şablonları (İşletme Tipine Göre)

```ts
const SERVICE_TEMPLATES: Record<string, { name: string; duration: number; price: number }[]> = {
  barber: [
    { name: 'Saç Kesimi',      duration: 30, price: 150 },
    { name: 'Sakal Kesimi',    duration: 20, price: 100 },
    { name: 'Saç + Sakal',     duration: 45, price: 220 },
    { name: 'Çocuk Saç Kesimi',duration: 20, price: 100 },
    { name: 'Saç Yıkama',      duration: 15, price:  80 },
  ],
  hair_salon: [
    { name: 'Saç Kesimi',      duration: 45, price: 200 },
    { name: 'Saç Boyama',      duration: 90, price: 500 },
    { name: 'Röfle / Balayage',duration: 120,price: 700 },
    { name: 'Fön',             duration: 30, price: 150 },
    { name: 'Keratin Bakımı',  duration: 90, price: 600 },
  ],
  beauty_salon: [
    { name: 'Cilt Bakımı',     duration: 60, price: 350 },
    { name: 'Manikür',         duration: 45, price: 200 },
    { name: 'Pedikür',         duration: 60, price: 250 },
    { name: 'Kaş Şekillendirme',duration:20, price: 100 },
    { name: 'Ağda',            duration: 30, price: 150 },
  ],
  spa: [
    { name: 'Klasik Masaj',    duration: 60, price: 500 },
    { name: 'Aromaterapi',     duration: 60, price: 600 },
    { name: 'Çift Masajı',     duration: 60, price: 900 },
    { name: 'Yüz Bakımı',      duration: 60, price: 400 },
    { name: 'Hamam',           duration: 60, price: 350 },
  ],
  nail_studio: [
    { name: 'Tırnak Bakımı',   duration: 45, price: 250 },
    { name: 'Kalıcı Oje',      duration: 60, price: 350 },
    { name: 'Protez Tırnak',   duration: 90, price: 500 },
    { name: 'Nail Art',        duration: 30, price: 200 },
  ],
  fitness: [
    { name: 'Personal Training',duration:60, price: 400 },
    { name: 'Pilates',         duration: 50, price: 300 },
    { name: 'Yoga',            duration: 60, price: 250 },
  ],
  car_wash: [
    { name: 'Dış Yıkama',              duration: 20, price: 150 },
    { name: 'İç + Dış Yıkama',         duration: 45, price: 300 },
    { name: 'Detaylı İç Temizlik',     duration: 60, price: 400 },
    { name: 'Motor Yıkama',            duration: 30, price: 250 },
    { name: 'Pasta & Cila',            duration: 90, price: 700 },
    { name: 'Koltuk Temizliği',        duration: 60, price: 350 },
  ],
  car_service: [
    { name: 'Yağ Değişimi',             duration: 30, price: 500 },
    { name: 'Lastik Değişimi (4 adet)', duration: 30, price: 400 },
    { name: 'Fren Bakımı',              duration: 60, price: 800 },
    { name: 'Periyodik Bakım',          duration: 90, price: 1500 },
    { name: 'Akü Değişimi',             duration: 20, price: 600 },
    { name: 'Far Ayarı',                duration: 20, price: 200 },
    { name: 'Klima Bakımı',             duration: 45, price: 700 },
  ],
  other: [],
};
```

---

## İşletme Tipi Seçenekleri

```ts
const CATEGORIES = [
  { key: 'barber',       label: 'Berber',           emoji: '✂️' },
  { key: 'hair_salon',   label: 'Kuaför',            emoji: '💇' },
  { key: 'beauty_salon', label: 'Güzellik Salonu',   emoji: '💄' },
  { key: 'spa',          label: 'Spa & Masaj',       emoji: '🧖' },
  { key: 'nail_studio',  label: 'Nail Stüdyo',       emoji: '💅' },
  { key: 'fitness',      label: 'Fitness / Spor',    emoji: '🏋️' },
  { key: 'other',        label: 'Diğer',             emoji: '🏪' },
];
```

---

## Adım 4 Akışı — Personel

```
"Siz de randevu alıyor musunuz?" toggle
  └─ EVET → Admin'in kendi çalışma saatleri Step 5'te ayarlanır
  └─ HAYIR → Sadece personel ekle

Personel listesi:
  [+ Personel Ekle] → isim + telefon satırı açılır (inline)
  Her satırda: Ad | Telefon | Sil
  "Şimdi Ekle" → API POST, liste güncellenir
```

---

## Adım 5 Akışı — Çalışma Saatleri

- Sahibi + eklenen tüm personeller listelenir
- Her personel için toggle ile çalışma saatleri ayarlanır
- "Tek seferde hepsine uygula" butonu (opsiyonel)

---

## Adım 6 — Tamamlandı

- Konfeti animasyonu (canvas-confetti veya saf CSS)
- Özet: kaç hizmet, kaç personel eklendi
- "Dashboard'a Git" butonu
- `PATCH /businesses/:id` → `{ onboarding_completed: true }` çağrısı yapılır

---

## İlerleme Durumu Saklama

### localStorage Key
```
onboarding_step_{businessId} → { step: 3, staffAdded: true, ownerWorking: true }
```

### Dashboard Banner (OnboardingBanner.tsx)
```tsx
// Onboarding tamamlanmamışsa dashboard üstünde gösterilir
if (!user.business?.onboarding_completed) {
  return <Banner onClick={() => navigate('/admin/onboarding')} />
}
```

---

## Uygulama Sırası

1. [ ] Backend: `onboarding_completed` alanı → Business entity + migration
2. [ ] Backend: Auth `/me` veya login response'una alan ekleme
3. [ ] Frontend: `auth.store.ts` User tipine alan ekleme
4. [ ] Frontend: `OnboardingPage.tsx` + 6 adım bileşeni
5. [ ] Frontend: `router.tsx` route ekleme
6. [ ] Frontend: `LoginPage.tsx` yönlendirme güncelleme
7. [ ] Frontend: `OnboardingBanner.tsx` + DashboardPage'e ekleme
