# Proje Durum Raporu
*Tarih: 2 Mayıs 2026*

---

## 1. Genel Değerlendirme

Multi-tenant randevu SaaS platformu olarak mimari sağlam, temel özellikler çalışıyor. Bir MVP'nin ötesinde, gerçek bir ürün olarak yayına alınabilecek seviyede. Eksikler daha çok "güzel olur" kategorisinde, "olmadan olmaz" kategorisinde değil.

---

## 2. Ne Tamamladık

### Backend

| Alan | Durum | Notlar |
|------|-------|--------|
| OTP / JWT Auth | ✅ | SMS OTP, access+refresh token, HttpOnly cookie |
| Çok kiracılı mimari (multi-tenant) | ✅ | Her işletme izole veri |
| Randevu CRUD + durum akışı | ✅ | pending→approved→completed ve diğer geçişler |
| Public booking (throttle) | ✅ | 5 req/dk/IP, müşteri kaydı gerekmez |
| Slot üretimi | ✅ | Luxon, çalışma saatleri + bloke periyotlar dikkate alınır |
| Slot kilitleme (WebSocket) | ✅ | Redis 180s TTL, çift booking engeli |
| Personel yönetimi | ✅ | CRUD, çalışma saatleri, bloke periyot, beceri eşleme |
| Hizmet yönetimi | ✅ | CRUD, süre, fiyat, kategori |
| SMS bildirimleri | ✅ | Onay, red, hatırlatma, iptal — İletimerkezi |
| Push bildirimleri | ✅ | Web Push / VAPID, PWA, kaldı-abone ol akışı |
| WhatsApp | ⚠️ | Altyapı hazır, provider entegrasyonu yok |
| Zamanlayıcı hatırlatmalar | ✅ | Bull queue, 60/120/180/1440/2880 dk önce |
| Raporlama | ✅ | Aylık overview, günlük heatmap |
| Plan limitleri | ✅ | free/pro/business, hard limit enforce |
| Super admin paneli | ✅ | İşletme listesi, plan değiştirme, kullanıcı bloklama |
| Destek talebi | ✅ | Müşteri → super admin ticket akışı |
| İşletme türleri | ✅ | Admin tarafından yönetilen kategoriler + şablon hizmetler |
| Token tabanlı iptal/yeniden planlama | ✅ | SMS linkten gelen aksiyon |
| QR kod | ✅ | PNG/SVG, personel de indirebilir |
| Upload | ✅ | Lokal driver, logo yükleme |
| Opening hours birleşimi | ✅ | Tüm aktif personelin en geniş penceresi, tek endpoint |

### Frontend

| Sayfa / Bileşen | Durum |
|-----------------|-------|
| Login (OTP) | ✅ |
| Kayıt (yeni işletme) | ✅ |
| Vitrin (public storefront) | ✅ |
| Booking akışı (5 adım) | ✅ |
| SMS link → iptal/yeniden planlama | ✅ |
| Admin: dashboard | ✅ |
| Admin: onboarding (8 adım, skip destekli) | ✅ |
| Admin: randevular (kendi) | ✅ |
| Admin: tüm randevular (personel filtreli) | ✅ |
| Admin: personel yönetimi | ✅ |
| Admin: hizmet yönetimi | ✅ |
| Admin: raporlar | ✅ |
| Admin: ayarlar | ✅ |
| Admin: çalışma saatlerim | ✅ |
| Personel: randevular | ✅ |
| Personel: çalışma saatleri | ✅ |
| Personel: paylaş / QR | ✅ |
| Super admin: işletmeler | ✅ |
| Super admin: destek talepleri | ✅ |
| Super admin: işletme türleri | ✅ |
| Bildirim zili + dropdown | ✅ |
| Push izin banner'ı | ✅ |
| Gerçek zamanlı randevu bildirimleri | ✅ |
| Slot kilitleme (booking sırasında) | ✅ |
| 4 dil (TR/EN/DE/RU) | ✅ |
| PWA (offline-capable shell) | ✅ |
| Telefon input (70 ülke, E.164) | ✅ |

---

## 3. Eksikler — Kod Tarafı

### Kritik Eksikler

| Eksik | Neden Önemli |
|-------|-------------|
| **Test yok** | Hiçbir unit veya e2e test yok. Refactor riski yüksek, regresyon tespiti körü körüne. |
| **WhatsApp provider** | WhatsApp altyapısı, queue'su, DB alanları hazır ama Meta Business API bağlantısı stub olarak kaldı. |
| **E-posta bildirimleri** | Sistemde hiç e-posta yok. SMS olmayan ülkelerde kullanıcı ulaşılamaz. |
| **S3 / cloud storage** | Logo yüklemeler Docker volume'da. Container silinince kaybolur. |

### Orta Öncelikli Eksikler

| Eksik | Notlar |
|-------|--------|
| API dokümantasyonu (Swagger) | Endpoint'ler iyi yapılandırılmış ama dışarıya açık dokümantasyon yok |
| Hata izleme (Sentry vb.) | Production'da hata tespiti loglar üzerinden yapılıyor |
| Admin → müşteri profil görünümü | Müşteri bazlı randevu geçmişi frontend'de yok |
| Abonelik ödeme entegrasyonu | Plan yükseltme akışı UI'da yok (super admin manuel yapıyor) |
| Background job monitor | Bull queues çalışıyor ama kuyruk durumunu izleyen bir UI yok |
| Database index review | Yüksek hacimde `appointments` sorguları için index optimizasyonu yapılmadı |

### Küçük Eksikler

| Eksik | Notlar |
|-------|--------|
| Skeleton loading | Her yerde spinner var, içerik gösterim geçişi kaba |
| Hata sayfaları | 404, 500 için kullanıcı dostu sayfa yok |
| Form doğrulama mesajları | Bazıları hâlâ hardcoded Türkçe, lokalizasyon eksik |
| PWA offline modu | SW cache var ama offline içerik stratejisi tanımlı değil |
| İşletme türü şablonları | İlk super admin seed edilmiş değil, admin elle girmeli |

---

## 4. Eksikler — Ürün Tarafı

Bir randevu sistemi olarak rakiplerle kıyaslandığında (Booksy, Setmore, Fresha) şunlar eksik:

### Müşteri Deneyimi

| Özellik | Açıklama |
|---------|----------|
| **Müşteri portalı** | Müşteri "aldığım randevularım" sayfası yok. Her randevu için SMS'teki linki bulması gerekiyor. |
| **Tekrar randevu al** | "Bir daha al" butonu veya müşteri geçmişinden hızlı yeniden rezervasyon yok. |
| **Bekleme listesi (waitlist)** | Dolu slota "beni bildir" özelliği yok. İptal olunca sistematik bildirim yok. |
| **Grup randevu** | Aynı anda birden fazla kişi için tek rezervasyon yok. |
| **Tekrarlayan randevu** | "Her hafta aynı saatte" diye rutin randevu yok. |
| **Değerlendirme / yorum** | Randevu sonrası müşteri puanlaması / yorum sistemi yok. |
| **Müşteri notları** | İşletme müşteriye not ekleyemiyor ("alerji: lateks" gibi). |
| **Booking widget** | "Web sitenize gömmek için" iframe veya JS snippet yok. |
| **Takvim senkronizasyonu** | Google Calendar / Apple Calendar'a randevu aktarımı yok. |

### İşletme Yönetimi

| Özellik | Açıklama |
|---------|----------|
| **Müşteri veritabanı (mini CRM)** | Tekrar gelen müşteri tanıma, geçmiş harcama, toplam ziyaret sayısı yok. |
| **Personel performans metrikleri** | "Bu ay Ali kaç tamamladı, iptal oranı ne?" sorularına cevap yok. |
| **Ön ödeme / depozito** | No-show'u önlemek için booking sırasında ödeme alma yok. |
| **İndirim / kupon kodu** | Promosyon sistemi yok. |
| **Referans takibi** | Müşteri kim aracılığıyla geldi? |
| **Günlük özet raporu** | Sabahları "bugün 5 randevun var" SMS/push otomatik özeti yok. |
| **Kapasite yönetimi** | Birden fazla koltuğu olan işletmeler (berber salonu: 3 berber aynı anda) için paralel slot desteği yok (şu an 1 personel = 1 slot). |
| **Hizmet kategorileri görüntüsü** | Vitrin'de kategoriler sıralanabiliyor ama filtre/tab UI henüz yok. |
| **SMS / WhatsApp iki yönlü mesaj** | Müşteri SMS'e yanıt verince işletme göremez. |

### Teknik Ürün Eksikleri

| Özellik | Açıklama |
|---------|----------|
| **Webhook** | Yeni randevu gelince dışarıya HTTP POST atacak sistem yok (Zapier entegrasyonu vs.). |
| **Özel alan (custom field)** | İşletme booking formuna "araç plakası", "saç rengi" gibi özel soru ekleyemiyor. |
| **Custom domain** | Her işletme kendi alan adını bağlayamıyor (şu an sadece `/slug`). |
| **White-label** | Marka özelleştirme yok (renk, logo, domain). |

---

## 5. Teknik Borç

| Konu | Durum |
|------|-------|
| WebSocket nginx proxy (`map` direktifi) | ✅ Düzeltildi |
| Auth/refresh 401 sonsuz döngü | ✅ Düzeltildi |
| SW `skipWaiting` + `clientsClaim` | ✅ Düzeltildi |
| Çift socket bağlantısı (layout + sayfa) | ✅ Düzeltildi |
| Push izin gesture sorunu | ✅ Düzeltildi |
| Redis AOF corruption riski | ⚠️ Redis volume AOF persistence açık, `appendfsync always` yerine `everysec` önerilir |
| TypeORM nullable varchar explicit type | ✅ Kurala uyuluyor |

---

## 6. Öncelik Sıralaması (Sonraki Adımlar)

### Hemen yapılabilir (düşük efor, yüksek etki)
1. Müşteriye takvim dosyası (.ics) gönderme — randevu onayında Google/Apple Calendar'a eklenebilir
2. Günlük özet push/SMS — sabah X randevun var bildirimi
3. Değerlendirme linki SMS'e ekleme — booking tamamlandı → Google Reviews linki
4. Skeleton loading — kullanıcı deneyimi

### Orta vadeli (orta efor, yüksek etki)
5. WhatsApp provider bağlantısı (Meta Cloud API)
6. E-posta bildirimleri (Nodemailer / Resend)
7. Müşteri portalı — phone ile OTP → "randevularım"
8. Bekleme listesi
9. Özel booking form alanları

### Uzun vadeli (yüksek efor, stratejik)
10. Ön ödeme (Stripe entegrasyonu)
11. Mini CRM (müşteri kartı, geçmiş)
12. Booking widget (embed)
13. Test coverage
14. Webhook sistemi

---

## 7. Yayına Hazırlık Kontrol Listesi

```
✅ Docker Compose yapılandırması hazır
✅ Nginx reverse proxy yapılandırması hazır
✅ Environment variables belgelenmiş (.env.example)
⚠️  İletimerkezi API'si için sunucu IP'si whitelist'e eklenmeli
⚠️  VAPID key üretilmeli (push notifications)
⚠️  İlk super admin seed çalıştırılmalı (seed:admin:prod)
⚠️  Migration'lar production'da çalıştırılmalı (migration:run:prod)
⚠️  S3 bağlantısı kurulmalı (logo kayıplarını önlemek için)
❌  Test yokluğu (production riski)
❌  Hata izleme servisi (Sentry vb.) eksik
```
