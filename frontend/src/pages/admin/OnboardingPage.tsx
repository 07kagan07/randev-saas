import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Scissors, Sparkles, Flame, Leaf, Star, Dumbbell, Store, Wrench, Droplets, Plus, Trash2, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'barber',        label: 'Berber',          Icon: Scissors },
  { key: 'hair_salon',    label: 'Kuaför',           Icon: Sparkles },
  { key: 'beauty_center', label: 'Güzellik Salonu',  Icon: Flame },
  { key: 'spa',           label: 'Spa & Masaj',      Icon: Leaf },
  { key: 'nail_art',      label: 'Nail Stüdyo',      Icon: Star },
  { key: 'fitness',       label: 'Fitness / Spor',   Icon: Dumbbell },
  { key: 'car_wash',      label: 'Araç Yıkama',      Icon: Droplets },
  { key: 'car_service',   label: 'Araç Bakım',       Icon: Wrench },
  { key: 'other',         label: 'Diğer',            Icon: Store },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

type ServiceTemplate = { name: string; duration: number; price: number };
type ServiceGroup = { group: string; services: ServiceTemplate[] };

const SERVICE_TEMPLATES: Record<CategoryKey, ServiceGroup[]> = {
  barber: [
    { group: 'Saç Hizmetleri', services: [
      { name: 'Saç Kesimi',       duration: 30, price: 150 },
      { name: 'Sakal Kesimi',     duration: 20, price: 100 },
      { name: 'Saç + Sakal',      duration: 45, price: 220 },
      { name: 'Çocuk Saç Kesimi', duration: 20, price: 100 },
      { name: 'Saç Yıkama',       duration: 15, price:  80 },
    ]},
    { group: 'Cilt & Bakım', services: [
      { name: 'Yüz Maskesi',      duration: 20, price: 150 },
      { name: 'Cilt Bakımı',      duration: 30, price: 200 },
    ]},
  ],
  hair_salon: [
    { group: 'Kesim & Şekillendirme', services: [
      { name: 'Saç Kesimi', duration: 45, price: 200 },
      { name: 'Fön',        duration: 30, price: 150 },
    ]},
    { group: 'Renk & Bakım', services: [
      { name: 'Saç Boyama',       duration:  90, price: 500 },
      { name: 'Röfle / Balayage', duration: 120, price: 700 },
      { name: 'Keratin Bakımı',   duration:  90, price: 600 },
      { name: 'Ombre',            duration: 120, price: 750 },
    ]},
  ],
  beauty_center: [
    { group: 'Cilt Bakımı', services: [
      { name: 'Cilt Bakımı',  duration: 60, price: 350 },
      { name: 'Yüz Maskesi',  duration: 30, price: 200 },
    ]},
    { group: 'Tırnak Bakımı', services: [
      { name: 'Manikür', duration: 45, price: 200 },
      { name: 'Pedikür', duration: 60, price: 250 },
    ]},
    { group: 'Epilasyon', services: [
      { name: 'Kaş Şekillendirme', duration: 20, price: 100 },
      { name: 'Ağda',              duration: 30, price: 150 },
    ]},
  ],
  spa: [
    { group: 'Masaj', services: [
      { name: 'Klasik Masaj', duration: 60, price: 500 },
      { name: 'Aromaterapi',  duration: 60, price: 600 },
      { name: 'Çift Masajı',  duration: 60, price: 900 },
    ]},
    { group: 'Yüz & Cilt', services: [
      { name: 'Yüz Bakımı', duration: 60, price: 400 },
    ]},
    { group: 'Hamam & Kese', services: [
      { name: 'Hamam',          duration: 60, price: 350 },
      { name: 'Kese & Köpük',   duration: 45, price: 300 },
    ]},
  ],
  nail_art: [
    { group: 'Doğal Tırnak', services: [
      { name: 'Tırnak Bakımı', duration: 45, price: 250 },
      { name: 'Kalıcı Oje',    duration: 60, price: 350 },
    ]},
    { group: 'Uzatma & Tasarım', services: [
      { name: 'Protez Tırnak', duration: 90, price: 500 },
      { name: 'Nail Art',      duration: 30, price: 200 },
    ]},
  ],
  fitness: [
    { group: 'Birebir Antrenman', services: [
      { name: 'Personal Training', duration: 60, price: 400 },
    ]},
    { group: 'Grup Dersleri', services: [
      { name: 'Pilates', duration: 50, price: 300 },
      { name: 'Yoga',    duration: 60, price: 250 },
    ]},
  ],
  car_wash: [
    { group: 'Dış Temizlik', services: [
      { name: 'Dış Yıkama',    duration: 20, price: 150 },
      { name: 'İç + Dış Yıkama', duration: 45, price: 300 },
    ]},
    { group: 'İç Temizlik', services: [
      { name: 'Detaylı İç Temizlik', duration: 60, price: 400 },
      { name: 'Koltuk Temizliği',    duration: 60, price: 350 },
    ]},
    { group: 'Özel Bakım', services: [
      { name: 'Motor Yıkama', duration: 30, price: 250 },
      { name: 'Pasta & Cila', duration: 90, price: 700 },
    ]},
  ],
  car_service: [
    { group: 'Periyodik Bakım', services: [
      { name: 'Yağ Değişimi',    duration: 30, price:  500 },
      { name: 'Periyodik Bakım', duration: 90, price: 1500 },
      { name: 'Akü Değişimi',    duration: 20, price:  600 },
    ]},
    { group: 'Fren & Güvenlik', services: [
      { name: 'Lastik Değişimi (4 adet)', duration: 30, price: 400 },
      { name: 'Fren Bakımı',              duration: 60, price: 800 },
    ]},
    { group: 'Diğer Hizmetler', services: [
      { name: 'Far Ayarı',    duration: 20, price: 200 },
      { name: 'Klima Bakımı', duration: 45, price: 700 },
    ]},
  ],
  other: [],
};

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const TOTAL_STEPS = 6;

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

// Eski localStorage anahtarını temizle (migration)
function clearLegacyLs(bid: string) {
  localStorage.removeItem(`ob_${bid}`);
  localStorage.removeItem(`ob_step_${bid}`);
}

function ProgressBar({ step }: { step: number }) {
  const labels = ['İşletme Tipi', 'Bilgiler', 'Hizmetler', 'Personel', 'Saatler', 'Tamamlandı'];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {labels.map((l, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i < step ? 'bg-indigo-600 text-white' :
              i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] text-center hidden sm:block ${i === step ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{l}</span>
          </div>
        ))}
      </div>
      <div className="relative h-1.5 bg-gray-100 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, onNext, onBack, onSkip, nextLabel = 'İleri', nextDisabled = false, loading = false }: {
  title: string; subtitle?: string; children: React.ReactNode;
  onNext?: () => void; onBack?: () => void; onSkip?: () => void;
  nextLabel?: string; nextDisabled?: boolean; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="mb-5">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 -ml-0.5 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
      <div className="flex gap-3 mt-6">
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? 'Kaydediliyor...' : <>{nextLabel} <ChevronRight className="w-4 h-4" /></>}
          </button>
        )}
        {onSkip && (
          <button onClick={onSkip} className="px-5 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Atla
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Adım 1: İşletme Tipi ────────────────────────────────────────────────────

function Step1Category({ onNext, initialCategory }: { onNext: (cat: CategoryKey) => void; initialCategory?: CategoryKey }) {
  const [selected, setSelected] = useState<CategoryKey | null>(initialCategory ?? null);
  return (
    <Card
      title="İşletme tipiniz nedir?"
      subtitle="Türüne göre size hazır hizmet şablonları sunacağız."
      onNext={() => selected && onNext(selected)}
      nextDisabled={!selected}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              selected === key
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-indigo-300 text-gray-600'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium text-center">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── Adım 2: İşletme Bilgileri ───────────────────────────────────────────────

function Step2Info({ bid, onNext, onBack, onSkip, initialValues }: {
  bid: string; onNext: () => void; onBack: () => void; onSkip?: () => void;
  initialValues?: { phone: string; address: string; description: string };
}) {
  const [form, setForm] = useState({
    phone: initialValues?.phone ?? '',
    address: initialValues?.address ?? '',
    description: initialValues?.description ?? '',
  });
  // initialValues değişince formu güncelle (async yüklemede)
  const prevInitial = React.useRef(initialValues);
  React.useEffect(() => {
    if (initialValues && initialValues !== prevInitial.current) {
      prevInitial.current = initialValues;
      setForm({ phone: initialValues.phone, address: initialValues.address, description: initialValues.description });
    }
  }, [initialValues]);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.patch(`/businesses/${bid}`, {
        ...form,
        phone: form.phone ? `+90${form.phone}` : undefined,
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="İşletme bilgileriniz" subtitle="Müşterilerinizin sizi bulmasına yardımcı olur." onNext={save} onBack={onBack} onSkip={onSkip} loading={loading}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">+90</span>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              className="flex-1 px-3 py-2.5 text-sm outline-none"
              placeholder="5xx xxx xxxx"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
          <input
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Mahalle, Sokak No, İlçe / Şehir"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Açıklama <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Örn. 10 yıllık deneyimli ekibimizle hizmetinizdeyiz."
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Adım 3: Hizmetler ───────────────────────────────────────────────────────

interface ServiceRow { name: string; duration: number; price: number; selected: boolean; group?: string; }

function Step3Services({ bid, category, onNext, onBack, onSkip }: {
  bid: string; category: CategoryKey; onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const groups = SERVICE_TEMPLATES[category] ?? [];
  const [services, setServices] = useState<ServiceRow[]>(
    groups.flatMap(g => g.services.map(s => ({ ...s, selected: true, group: g.group })))
  );
  const [loading, setLoading] = useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const updateRow = (i: number, patch: Partial<ServiceRow>) =>
    setServices(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));

  const addCustom = () => {
    setServices(prev => [...prev, { name: '', duration: 30, price: 0, selected: true }]);
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const remove = (i: number) => setServices(prev => prev.filter((_, j) => j !== i));

  const save = async () => {
    const toCreate = services.filter(s => s.selected && s.name.trim());
    if (!toCreate.length) { onNext(); return; }
    setLoading(true);
    try {
      await Promise.all(toCreate.map(s =>
        api.post(`/businesses/${bid}/services`, {
          name: s.name, duration_minutes: s.duration, price: s.price,
        })
      ));
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Hangi hizmetleri sunuyorsunuz?" subtitle="Seçimleri düzenleyebilir, fiyat ve süre ekleyebilirsiniz." onNext={save} onBack={onBack} onSkip={onSkip} loading={loading}>
      <div ref={listRef} className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {services.map((s, i) => {
          const showHeader = s.group && (i === 0 || services[i - 1].group !== s.group);
          return (
            <React.Fragment key={i}>
              {showHeader && (
                <div className={`flex items-center gap-2 ${i > 0 ? 'pt-3' : 'pt-0'}`}>
                  <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider whitespace-nowrap">{s.group}</span>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>
              )}
              <div className={`p-3 rounded-xl border transition-colors ${s.selected ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-white opacity-50'}`}>
                {/* Satır 1: checkbox + isim + sil */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.selected}
                    onChange={e => updateRow(i, { selected: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 shrink-0"
                  />
                  <input
                    value={s.name}
                    onChange={e => updateRow(i, { name: e.target.value })}
                    className="flex-1 bg-transparent text-sm outline-none font-medium text-gray-800 min-w-0"
                    placeholder="Hizmet adı"
                  />
                  <button onClick={() => remove(i)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Satır 2: süre + fiyat */}
                <div className="flex items-center gap-4 mt-2 ml-6">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <input
                      type="number"
                      value={s.duration}
                      onChange={e => updateRow(i, { duration: +e.target.value })}
                      className="w-12 text-xs text-gray-600 bg-transparent outline-none border-b border-gray-200 text-center"
                      min={5}
                    />
                    <span className="text-xs text-gray-400">dk</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={s.price}
                      onChange={e => updateRow(i, { price: +e.target.value })}
                      className="w-16 text-xs text-gray-600 bg-transparent outline-none border-b border-gray-200 text-center"
                      min={0}
                    />
                    <span className="text-xs text-gray-400">₺</span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <button onClick={addCustom} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
        <Plus className="w-4 h-4" /> Özel hizmet ekle
      </button>
    </Card>
  );
}

// ─── Adım 4: Personel ────────────────────────────────────────────────────────

interface StaffRow { full_name: string; phone: string; saved: boolean; id?: string; }

function Step4Staff({ bid, ownerWorking, setOwnerWorking, staffList, setStaffList, onNext, onBack, onSkip }: {
  bid: string; ownerWorking: boolean; setOwnerWorking: (v: boolean) => void;
  staffList: StaffRow[]; setStaffList: (s: StaffRow[]) => void;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStaff = async () => {
    if (!form.full_name || !form.phone) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/businesses/${bid}/staff`, {
        full_name: form.full_name,
        phone: `+90${form.phone.replace(/\D/g, '')}`,
      });
      setStaffList([...staffList, { ...form, saved: true, id: data.data?.id }]);
      setForm({ full_name: '', phone: '' });
      setAdding(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Personel" subtitle="Ekibinizi tanımlayın. Siz de hizmet veriyorsanız belirtin." onNext={onNext} onBack={onBack} onSkip={onSkip}>
      {/* Sahibi çalışıyor mu */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Siz de randevu alıyor musunuz?</p>
          <p className="text-xs text-gray-500 mt-0.5">Evet ise çalışma saatlerinizi bir sonraki adımda ayarlarsınız.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={ownerWorking} onChange={e => setOwnerWorking(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>

      {/* Personel listesi */}
      {staffList.length > 0 && (
        <ul className="space-y-2 mb-3">
          {staffList.map((s, i) => (
            <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                {s.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                <p className="text-xs text-gray-400">{s.phone}</p>
              </div>
              <Check className="w-4 h-4 text-green-500 shrink-0" />
            </li>
          ))}
        </ul>
      )}

      {/* Ekle formu */}
      {adding ? (
        <div className="space-y-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Ad Soyad"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">+90</span>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="5xx xxx xxxx"
              className="flex-1 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addStaff} disabled={loading || !form.full_name || !form.phone} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium py-2 rounded-xl">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button onClick={() => { setAdding(false); setForm({ full_name: '', phone: '' }); }} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-xl hover:bg-white">
              İptal
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
          <Plus className="w-4 h-4" /> Personel ekle
        </button>
      )}
    </Card>
  );
}

// ─── Adım 5: Çalışma Saatleri ────────────────────────────────────────────────

interface HoursState { staffId: string; name: string; hours: { day_of_week: number; is_open: boolean; start_time: string; end_time: string }[]; }

function defaultHours(staffId: string, name: string): HoursState {
  return {
    staffId,
    name,
    hours: Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i, is_open: i < 5, start_time: '09:00', end_time: '18:00',
    })),
  };
}

function Step5Hours({ userId, userName, staffList, onNext, onBack, onSkip }: {
  userId: string; userName: string;
  staffList: { id?: string; full_name: string }[];
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const [allHours, setAllHours] = useState<HoursState[]>(() => {
    const list: HoursState[] = [defaultHours(userId, userName || 'Siz')];
    staffList.forEach(s => s.id && list.push(defaultHours(s.id, s.full_name)));
    return list;
  });
  const [loading, setLoading] = useState(false);

  const updateHour = (personIdx: number, dayIdx: number, patch: Partial<HoursState['hours'][0]>) => {
    setAllHours(prev => prev.map((p, pi) => pi !== personIdx ? p : {
      ...p,
      hours: p.hours.map((h, di) => di === dayIdx ? { ...h, ...patch } : h),
    }));
  };

  const save = async () => {
    setLoading(true);
    try {
      await Promise.all(allHours.map(p => {
        const schedule = Object.fromEntries(
          p.hours.map(h => [h.day_of_week, { is_open: h.is_open, start_time: h.start_time, end_time: h.end_time }])
        );
        return api.patch(`/staff/${p.staffId}/working-hours`, { schedule });
      }));
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Çalışma saatleri" subtitle="Her kişi için hangi günler ve saatler uygun?" onNext={save} onBack={onBack} onSkip={onSkip} loading={loading}>
      <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
        {allHours.map((p, pi) => (
          <div key={pi}>
            <p className="text-sm font-semibold text-gray-700 mb-2">{p.name}</p>
            <div className="space-y-1.5">
              {p.hours.map((h, di) => (
                <div key={di} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" checked={h.is_open} onChange={e => updateHour(pi, di, { is_open: e.target.checked })} className="sr-only peer" />
                      <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-xs text-gray-700 w-16 shrink-0">{DAYS[h.day_of_week]}</span>
                  </div>
                  {h.is_open ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="time" value={h.start_time} onChange={e => updateHour(pi, di, { start_time: e.target.value })}
                        className="w-[68px] border border-gray-200 rounded-lg px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden" />
                      <span className="text-gray-300 text-xs">–</span>
                      <input type="time" value={h.end_time} onChange={e => updateHour(pi, di, { end_time: e.target.value })}
                        className="w-[68px] border border-gray-200 rounded-lg px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden" />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">Kapalı</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Adım 6: Tamamlandı ──────────────────────────────────────────────────────

function Step6Done({ skippedCount, onFinish }: { skippedCount: number; onFinish: () => void }) {
  const hasSkipped = skippedCount > 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${hasSkipped ? 'bg-amber-100' : 'bg-green-100'}`}>
        <Check className={`w-8 h-8 ${hasSkipped ? 'text-amber-600' : 'text-green-600'}`} />
      </div>
      {hasSkipped ? (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Neredeyse hazır!</h2>
          <p className="text-gray-500 text-sm mb-2">
            <span className="font-medium text-amber-600">{skippedCount} adım</span> atlandı.
            Dashboard'dan tamamlayabilirsiniz.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Harika! Her şey hazır 🎉</h2>
          <p className="text-gray-500 text-sm mb-2">İşletmeniz artık randevu almaya hazır. Müşterileriniz sizi bulabilir.</p>
        </>
      )}
      <button
        onClick={onFinish}
        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Dashboard'a Git
      </button>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const bid = user?.business_id!;
  const userId = user?.id!;
  const userName = user?.full_name || 'Siz';

  const [step, setStep] = useState<number>(0);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [category, setCategory] = useState<CategoryKey>('other');
  const [initialInfo, setInitialInfo] = useState({ phone: '', address: '', description: '' });
  const [ownerWorking, setOwnerWorking] = useState(true);
  const [staffList, setStaffList] = useState<{ id?: string; full_name: string; phone: string; saved: boolean }[]>([]);

  // İşletme verilerini yükle → form pre-fill + adımı geri yükle
  useEffect(() => {
    if (!bid) return;
    clearLegacyLs(bid); // eski localStorage'ı temizle
    api.get(`/businesses/${bid}`).then(({ data }) => {
      const biz = data.data;
      if (biz.category && CATEGORIES.some(c => c.key === biz.category)) {
        setCategory(biz.category as CategoryKey);
      }
      setInitialInfo({
        phone: biz.phone ? biz.phone.replace(/^\+90/, '') : '',
        address: biz.address || '',
        description: biz.description || '',
      });
      const skipped: number[] = biz.onboarding_skipped_steps ?? [];
      const savedStep: number = biz.onboarding_step ?? 0;
      setSkippedSteps(skipped);
      // Atlanan adım varsa oraya, değilse kayıtlı adıma git
      setStep(skipped.length > 0 ? Math.min(...skipped) : savedStep);
    }).catch(() => {});
  }, [bid]); // eslint-disable-line react-hooks/exhaustive-deps

  // İlerlemeyi backend'e kaydet (fire-and-forget)
  const persist = (newStep: number, newSkipped: number[]) => {
    api.patch(`/businesses/${bid}`, {
      onboarding_step: newStep,
      onboarding_skipped_steps: newSkipped,
    }).catch(() => {});
  };

  const advance = () => {
    const next = step + 1;
    setStep(next);
    persist(next, skippedSteps);
  };

  // Bir adımı atla: skippedSteps listesine ekle ve ilerle
  const skipStep = (stepNum: number) => {
    const newSkipped = skippedSteps.includes(stepNum) ? skippedSteps : [...skippedSteps, stepNum];
    const next = step + 1;
    setSkippedSteps(newSkipped);
    setStep(next);
    persist(next, newSkipped);
  };

  // Önceden atlanmış adımı tamamla: listeden çıkar, sonraki atlananı veya Done'a git
  const completeSkipped = (stepNum: number) => {
    const remaining = skippedSteps.filter(s => s !== stepNum);
    const next = remaining.length === 0 ? TOTAL_STEPS - 1 : Math.min(...remaining);
    setSkippedSteps(remaining);
    setStep(next);
    persist(next, remaining);
  };

  // Mevcut adım daha önce atlandı mı?
  const isResuming = skippedSteps.includes(step);

  const handleCategory = async (cat: CategoryKey) => {
    setCategory(cat);
    await api.patch(`/businesses/${bid}`, { category: cat });
    isResuming ? completeSkipped(0) : advance();
  };

  const finishOnboarding = async () => {
    // Atlanan adım varsa kurulum tamamlanmış sayılmaz → banner gösterilir
    const allDone = skippedSteps.length === 0;
    await api.patch(`/businesses/${bid}`, {
      onboarding_completed: allDone,
      onboarding_step: TOTAL_STEPS - 1,
      onboarding_skipped_steps: skippedSteps, // mevcut listeyi koru
    });
    if (allDone) {
      useAuthStore.setState(state => ({
        user: state.user ? { ...state.user, onboarding_completed: true } : null,
      }));
    }
    qc.invalidateQueries();
    navigate('/admin');
  };

  const nextFor = (stepNum: number) => isResuming ? () => completeSkipped(stepNum) : advance;
  const skipFor  = (stepNum: number) => isResuming ? undefined : () => skipStep(stepNum);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Hoş geldiniz! Hızlıca kurulum yapalım.</h1>
          <p className="text-sm text-gray-500 mt-1">Bu adımları dilediğiniz zaman ayarlardan değiştirebilirsiniz.</p>
        </div>

        <ProgressBar step={step} />

        {step === 0 && <Step1Category onNext={handleCategory} initialCategory={category} />}
        {step === 1 && (
          <Step2Info
            bid={bid}
            initialValues={initialInfo}
            onNext={nextFor(1)}
            onBack={() => setStep(0)}
            onSkip={skipFor(1)}
          />
        )}
        {step === 2 && (
          <Step3Services
            bid={bid}
            category={category}
            onNext={nextFor(2)}
            onBack={() => setStep(1)}
            onSkip={skipFor(2)}
          />
        )}
        {step === 3 && (
          <Step4Staff
            bid={bid}
            ownerWorking={ownerWorking}
            setOwnerWorking={setOwnerWorking}
            staffList={staffList}
            setStaffList={setStaffList}
            onNext={nextFor(3)}
            onBack={() => setStep(2)}
            onSkip={skipFor(3)}
          />
        )}
        {step === 4 && (
          ownerWorking || staffList.some(s => s.id) ? (
            <Step5Hours
              userId={userId}
              userName={userName}
              staffList={staffList}
              onNext={nextFor(4)}
              onBack={() => setStep(3)}
              onSkip={skipFor(4)}
            />
          ) : <Step6Done skippedCount={skippedSteps.length} onFinish={finishOnboarding} />
        )}
        {step === 5 && <Step6Done skippedCount={skippedSteps.length} onFinish={finishOnboarding} />}
      </div>
    </div>
  );
}
