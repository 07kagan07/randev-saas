import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Clock, Copy } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import PhoneInput from '../../components/shared/PhoneInput';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../data/countries';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearLegacyLs(bid: string) {
  localStorage.removeItem(`ob_${bid}`);
  localStorage.removeItem(`ob_step_${bid}`);
}

function ProgressBar({ step }: { step: number }) {
  const { t } = useTranslation();
  const labels = [
    t('onboarding.steps.businessName'),
    t('onboarding.steps.businessType'),
    t('onboarding.steps.info'),
    t('onboarding.steps.services'),
    t('onboarding.steps.staff'),
    t('onboarding.steps.skills'),
    t('onboarding.steps.hours'),
    t('onboarding.steps.done'),
  ];
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

function Card({ title, subtitle, children, onNext, onBack, onSkip, nextLabel, nextDisabled = false, loading = false }: {
  title: string; subtitle?: string; children: React.ReactNode;
  onNext?: () => void; onBack?: () => void; onSkip?: () => void;
  nextLabel?: string; nextDisabled?: boolean; loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="mb-5">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 -ml-0.5 transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t('common.back')}
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
            {loading ? t('common.saving') : <>{nextLabel ?? t('common.next')} <ChevronRight className="w-4 h-4" /></>}
          </button>
        )}
        {onSkip && (
          <button onClick={onSkip} className="px-5 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            {t('common.skip')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 0: Business Name ────────────────────────────────────────────────────

function Step0BusinessName({ onCreated }: {
  onCreated: (bid: string, accessToken: string, updatedUser: any) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/setup-business', { name: name.trim() });
      onCreated(data.data.user.business_id, data.data.access_token, data.data.user);
    } catch (e: any) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t('onboarding.step0.title')}
      subtitle={t('onboarding.step0.subtitle')}
      onNext={save}
      nextDisabled={!name.trim()}
      loading={loading}
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={t('onboarding.step0.placeholder')}
        autoFocus
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </Card>
  );
}

// ─── Step 1: Business Type ────────────────────────────────────────────────────

interface BusinessTypeOption { id: string; name: string; icon: string | null; template_services: any[]; }

function Step1Category({ onNext, initialTypeId }: { onNext: (typeId: string, type: BusinessTypeOption) => void; initialTypeId?: string }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(initialTypeId ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ['business-types-public'],
    queryFn: () => api.get('/business-types?active=true').then(r => (r.data?.data ?? r.data) as BusinessTypeOption[]),
  });
  const types: BusinessTypeOption[] = Array.isArray(data) ? data : [];

  return (
    <Card
      title={t('onboarding.step1.title')}
      subtitle={t('onboarding.step1.subtitle')}
      onNext={() => { const bt = types.find(bt => bt.id === selectedId); if (bt) onNext(bt.id, bt); }}
      nextDisabled={!selectedId}
    >
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {types.map((bt) => (
            <button
              key={bt.id}
              onClick={() => setSelectedId(bt.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                selectedId === bt.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-indigo-300 text-gray-600'
              }`}
            >
              <span className="text-2xl">{bt.icon ?? '🏪'}</span>
              <span className="text-xs font-medium text-center">{bt.name}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Step 2: Business Info ───────────────────────────────────────────────────

const TIMEZONES = [
  'Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Kiev', 'Europe/Athens',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Tehran', 'Asia/Karachi',
  'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Seoul', 'Asia/Baku', 'Asia/Tbilisi', 'Asia/Jerusalem',
  'Africa/Cairo', 'Africa/Casablanca', 'Africa/Lagos', 'Africa/Johannesburg',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'Australia/Sydney', 'Pacific/Auckland',
];

function Step2Info({ bid, onNext, onBack, onSkip, initialValues }: {
  bid: string; onNext: () => void; onBack: () => void; onSkip?: () => void;
  initialValues?: { phone: string; address: string; description: string; country: string; city: string; timezone: string };
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    phone:       initialValues?.phone       ?? '',
    address:     initialValues?.address     ?? '',
    description: initialValues?.description ?? '',
    country:     initialValues?.country     ?? DEFAULT_COUNTRY.code,
    city:        initialValues?.city        ?? '',
    timezone:    initialValues?.timezone    ?? DEFAULT_COUNTRY.timezone,
  });

  const prevInitial = React.useRef(initialValues);
  React.useEffect(() => {
    if (initialValues && initialValues !== prevInitial.current) {
      prevInitial.current = initialValues;
      setForm({
        phone:       initialValues.phone,
        address:     initialValues.address,
        description: initialValues.description,
        country:     initialValues.country  || DEFAULT_COUNTRY.code,
        city:        initialValues.city     || '',
        timezone:    initialValues.timezone || DEFAULT_COUNTRY.timezone,
      });
    }
  }, [initialValues]);

  const [loading, setLoading] = useState(false);

  const handleCountryChange = (code: string) => {
    const found = COUNTRIES.find(c => c.code === code);
    setForm(f => ({
      ...f,
      country:  code,
      timezone: found?.timezone ?? f.timezone,
    }));
  };

  const save = async () => {
    setLoading(true);
    try {
      await api.patch(`/businesses/${bid}`, {
        phone:       form.phone || undefined,
        address:     form.address || undefined,
        description: form.description || undefined,
        country:     form.country || undefined,
        city:        form.city || undefined,
        timezone:    form.timezone,
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('onboarding.step2.title')} subtitle={t('onboarding.step2.subtitle')} onNext={save} onBack={onBack} onSkip={onSkip} loading={loading}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.step2.country')}</label>
            <select
              value={form.country}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.step2.city')}</label>
            <input
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('onboarding.step2.cityPlaceholder')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.step2.timezone')}</label>
          <select
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">{t('onboarding.step2.timezoneHelp')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('onboarding.step2.phone')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
          </label>
          <PhoneInput
            value={form.phone}
            onChange={v => setForm(f => ({ ...f, phone: v }))}
            placeholder={t('onboarding.step2.phonePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.step2.address')}</label>
          <input
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t('onboarding.step2.addressPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('onboarding.step2.description')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder={t('onboarding.step2.descriptionPlaceholder')}
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Step 3: Services ────────────────────────────────────────────────────────

interface ServiceRow { name: string; duration: number; price: number; selected: boolean; group?: string; category?: string; }

function CategoryInput({ value, onChange, suggestions, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : suggestions;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={`w-full text-xs bg-transparent outline-none border-b placeholder-gray-300 ${
          !value.trim() ? 'border-red-400 text-red-500' : 'border-gray-200 text-gray-500'
        }`}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-full max-h-36 overflow-y-auto">
          {filtered.map(s => (
            <li
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              className="px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Step3Services({ bid, businessType, onNext, onBack, onSkip }: {
  bid: string; businessType: BusinessTypeOption | null; onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const { t } = useTranslation();

  const templateRows: ServiceRow[] = businessType?.template_services?.map((s: any) => ({
    name: s.name,
    duration: s.duration_minutes,
    price: s.price,
    selected: true,
    group: s.category || undefined,
    category: s.category || '',
  })) ?? [];

  const [services, setServices] = useState<ServiceRow[]>(templateRows);
  const [loading, setLoading] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const listRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const templateCategories = Array.from(new Set(
      (businessType?.template_services ?? []).map((s: any) => s.category).filter(Boolean)
    ));
    api.get(`/businesses/${bid}/services`).then(({ data }) => {
      const existing: string[] = (data.data ?? [])
        .map((s: any) => s.category)
        .filter(Boolean);
      setCategorySuggestions(Array.from(new Set([...templateCategories, ...existing])));
    }).catch(() => {
      setCategorySuggestions(templateCategories as string[]);
    });
  }, [bid]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (i: number, patch: Partial<ServiceRow>) =>
    setServices(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));

  const addCustom = () => {
    setServices(prev => [...prev, { name: '', duration: 30, price: 0, selected: true, category: '' }]);
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const remove = (i: number) => setServices(prev => prev.filter((_, j) => j !== i));

  const hasInvalidCustom = services.some(s => s.selected && s.name.trim() && !s.group && !s.category?.trim());

  const save = async () => {
    const toCreate = services.filter(s => s.selected && s.name.trim());
    if (!toCreate.length) { onNext(); return; }
    setLoading(true);
    try {
      await Promise.all(toCreate.map(s =>
        api.post(`/businesses/${bid}/services`, {
          name: s.name,
          duration_minutes: s.duration,
          price: s.price,
          category: s.category?.trim() || undefined,
        })
      ));
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t('onboarding.step3.title')}
      subtitle={t('onboarding.step3.subtitle')}
      onNext={save} onBack={onBack} onSkip={onSkip} loading={loading} nextDisabled={hasInvalidCustom}
    >
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
                    placeholder={t('onboarding.step3.namePlaceholder')}
                  />
                  <button onClick={() => remove(i)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                    <span className="text-xs text-gray-400">{t('common.minutes')}</span>
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
                {!s.group && (
                  <div className="mt-2 ml-6">
                    <CategoryInput
                      value={s.category ?? ''}
                      onChange={v => updateRow(i, { category: v })}
                      suggestions={categorySuggestions}
                      placeholder={t('onboarding.category')}
                    />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <button onClick={addCustom} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
        <Plus className="w-4 h-4" /> {t('onboarding.step3.addCustom')}
      </button>
    </Card>
  );
}

// ─── Step 4: Staff ───────────────────────────────────────────────────────────

interface StaffRow { full_name: string; phone: string; saved: boolean; id?: string; }

function Step4Staff({ bid, ownerWorking, setOwnerWorking, staffList, setStaffList, onNext, onBack, onSkip }: {
  bid: string; ownerWorking: boolean; setOwnerWorking: (v: boolean) => void;
  staffList: StaffRow[]; setStaffList: (s: StaffRow[]) => void;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const { t } = useTranslation();
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
        phone: form.phone,
      });
      setStaffList([...staffList, { ...form, saved: true, id: data.data?.id }]);
      setForm({ full_name: '', phone: '' });
      setAdding(false);
    } catch (e: any) {
      setError(e.response?.data?.message || t('common.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('onboarding.step4.title')} subtitle={t('onboarding.step4.subtitle')} onNext={onNext} onBack={onBack} onSkip={onSkip}>
      <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('onboarding.step4.ownerWorking')}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('onboarding.step4.ownerWorkingHelp')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={ownerWorking} onChange={e => setOwnerWorking(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>

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

      {adding ? (
        <div className="space-y-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder={t('onboarding.step4.namePlaceholder')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
          />
          <PhoneInput
            value={form.phone}
            onChange={v => setForm(f => ({ ...f, phone: v }))}
            placeholder={t('onboarding.step4.phonePlaceholder')}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addStaff} disabled={loading || !form.full_name || !form.phone} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium py-2 rounded-xl">
              {loading ? t('common.adding') : t('common.add')}
            </button>
            <button onClick={() => { setAdding(false); setForm({ full_name: '', phone: '' }); }} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-xl hover:bg-white">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
          <Plus className="w-4 h-4" /> {t('onboarding.step4.addStaff')}
        </button>
      )}
    </Card>
  );
}

// ─── Step 5: Staff ↔ Service Skills ──────────────────────────────────────────

function Step4StaffServices({ bid, staffList, onNext, onBack, onSkip }: {
  bid: string;
  staffList: { id?: string; full_name: string }[];
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}) {
  const { t } = useTranslation();
  const eligibleStaff = staffList.filter(s => s.id);

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['onboarding-services', bid],
    queryFn: () => api.get(`/businesses/${bid}/services`).then(r => (r.data?.data ?? []) as { id: string; name: string }[]),
    enabled: !!bid,
  });
  const services: { id: string; name: string }[] = servicesData ?? [];

  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!services.length) return;
    const initial: Record<string, string[]> = {};
    eligibleStaff.forEach(s => {
      initial[s.id!] = services.map(svc => svc.id);
    });
    setMapping(initial);
  }, [services.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (staffId: string, serviceId: string) => {
    setMapping(prev => {
      const current = prev[staffId] ?? [];
      const has = current.includes(serviceId);
      return { ...prev, [staffId]: has ? current.filter(id => id !== serviceId) : [...current, serviceId] };
    });
  };

  const toggleAll = (staffId: string) => {
    setMapping(prev => {
      const current = prev[staffId] ?? [];
      return { ...prev, [staffId]: current.length === services.length ? [] : services.map(s => s.id) };
    });
  };

  const save = async () => {
    if (!eligibleStaff.length) { onNext(); return; }
    setLoading(true);
    try {
      await Promise.all(
        eligibleStaff.map(s =>
          api.patch(`/businesses/${bid}/staff/${s.id}`, {
            service_ids: mapping[s.id!] ?? [],
          })
        )
      );
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t('onboarding.step5.title')}
      subtitle={t('onboarding.step5.subtitle')}
      onNext={save}
      onBack={onBack}
      onSkip={onSkip}
      loading={loading}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : !eligibleStaff.length ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>{t('onboarding.noStaffAdded')}</p>
          <p className="mt-1 text-xs">{t('onboarding.stepSkipHint')}</p>
        </div>
      ) : !services.length ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          {t('onboarding.noServicesForSkills')}
        </div>
      ) : (
        <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
          {eligibleStaff.map(s => {
            const selected = mapping[s.id!] ?? [];
            const allSelected = selected.length === services.length;
            return (
              <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{s.full_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAll(s.id!)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    {allSelected ? t('common.deselectAll') : t('common.selectAll')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {services.map(svc => {
                    const active = selected.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggle(s.id!, svc.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-colors ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                        }`}
                      >
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Step 6: Working Hours ────────────────────────────────────────────────────

interface HoursState { staffId: string; name: string; hours: { day_of_week: number; is_open: boolean; start_time: string; end_time: string }[]; }

function defaultHoursState(staffId: string, name: string): HoursState {
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
  const { t } = useTranslation();
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const DAYS = DAY_KEYS.map(k => t(`common.days.${k}`));

  const [allHours, setAllHours] = useState<HoursState[]>(() => {
    const list: HoursState[] = [defaultHoursState(userId, userName)];
    staffList.forEach(s => s.id && list.push(defaultHoursState(s.id, s.full_name)));
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
    <Card title={t('onboarding.step6.title')} subtitle={t('onboarding.step6.subtitle')} onNext={save} onBack={onBack} onSkip={onSkip} loading={loading}>
      <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
        {allHours.map((p, pi) => (
          <div key={pi}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">{p.name}</p>
              <button
                type="button"
                onClick={() => {
                  const mon = p.hours[0];
                  setAllHours(prev => prev.map((person, pIdx) => pIdx !== pi ? person : {
                    ...person,
                    hours: person.hours.map((h, di) =>
                      di >= 1 && di <= 4
                        ? { ...h, is_open: mon.is_open, start_time: mon.start_time, end_time: mon.end_time }
                        : h
                    ),
                  }));
                }}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                {t('onboarding.step6.applyWeekdays')}
              </button>
            </div>
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
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{t('common.closed')}</span>
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

// ─── Step 7: Done ─────────────────────────────────────────────────────────────

function Step6Done({ skippedCount, onFinish, slug }: { skippedCount: number; onFinish: () => void; slug?: string | null }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const bookingUrl = slug ? `${window.location.origin}/${slug}/book` : null;

  const copy = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSkipped = skippedCount > 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${hasSkipped ? 'bg-amber-100' : 'bg-green-100'}`}>
        <Check className={`w-8 h-8 ${hasSkipped ? 'text-amber-600' : 'text-green-600'}`} />
      </div>
      {hasSkipped ? (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.step7.almostDone')}</h2>
          <p className="text-gray-500 text-sm mb-2">
            {t('onboarding.step7.almostSubtitle', { count: skippedCount })}
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.step7.allDone')}</h2>
          <p className="text-gray-500 text-sm mb-2">{t('onboarding.step7.allDoneSubtitle')}</p>
        </>
      )}

      {bookingUrl && (
        <div className="mt-6 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('onboarding.step7.bookingLink')}</p>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <span className="flex-1 text-sm text-indigo-700 truncate font-mono">{bookingUrl}</span>
            <button
              onClick={copy}
              className="shrink-0 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
              title={t('common.copy')}
            >
              {copied
                ? <Check className="w-4 h-4 text-green-500" />
                : <Copy className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">{t('onboarding.step7.shareLinkHint')}</p>
        </div>
      )}

      <button
        onClick={onFinish}
        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {t('onboarding.step7.gotoDashboard')}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const userId = user?.id!;
  const userName = user?.full_name || t('onboarding.you');

  const [bid, setBid] = useState<string | null>(user?.business_id ?? null);
  const [step, setStep] = useState<number>(0);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [selectedBusinessTypeId, setSelectedBusinessTypeId] = useState<string | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeOption | null>(null);
  const [initialInfo, setInitialInfo] = useState({ phone: '', address: '', description: '', country: DEFAULT_COUNTRY.code, city: '', timezone: DEFAULT_COUNTRY.timezone });
  const [ownerWorking, setOwnerWorking] = useState(true);
  const [staffList, setStaffList] = useState<{ id?: string; full_name: string; phone: string; saved: boolean }[]>([]);
  const [bizSlug, setBizSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!bid) return;
    clearLegacyLs(bid);
    api.get(`/businesses/${bid}`).then(({ data }) => {
      const biz = data.data;
      setBizSlug(biz.slug ?? null);
      if (biz.business_type_id) {
        setSelectedBusinessTypeId(biz.business_type_id);
        api.get(`/business-types/${biz.business_type_id}`).then(({ data: btData }) => {
          setSelectedBusinessType(btData?.data ?? btData);
        }).catch(() => {});
      }
      setInitialInfo({
        phone:       biz.phone       || '',
        address:     biz.address     || '',
        description: biz.description || '',
        country:     biz.country     || DEFAULT_COUNTRY.code,
        city:        biz.city        || '',
        timezone:    biz.timezone    || DEFAULT_COUNTRY.timezone,
      });
      const skipped: number[] = biz.onboarding_skipped_steps ?? [];
      const savedStep: number = biz.onboarding_step ?? 0;
      setSkippedSteps(skipped);
      setStep(skipped.length > 0 ? Math.min(...skipped) : savedStep);
    }).catch(() => {});
  }, [bid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBusinessCreated = (newBid: string, accessToken: string, updatedUser: any) => {
    useAuthStore.setState(state => ({
      accessToken,
      user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
    }));
    setBid(newBid);
    setStep(0);
  };

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

  const skipStep = (stepNum: number) => {
    const newSkipped = skippedSteps.includes(stepNum) ? skippedSteps : [...skippedSteps, stepNum];
    const next = step + 1;
    setSkippedSteps(newSkipped);
    setStep(next);
    persist(next, newSkipped);
  };

  const completeSkipped = (stepNum: number) => {
    const remaining = skippedSteps.filter(s => s !== stepNum);
    const next = remaining.length === 0 ? TOTAL_STEPS - 1 : Math.min(...remaining);
    setSkippedSteps(remaining);
    setStep(next);
    persist(next, remaining);
  };

  const isResuming = skippedSteps.includes(step);

  const handleCategory = async (typeId: string, type: BusinessTypeOption) => {
    setSelectedBusinessTypeId(typeId);
    setSelectedBusinessType(type);
    await api.patch(`/businesses/${bid}`, { business_type_id: typeId });
    isResuming ? completeSkipped(0) : advance();
  };

  const finishOnboarding = async () => {
    const allDone = skippedSteps.length === 0;
    await api.patch(`/businesses/${bid}`, {
      onboarding_completed: allDone,
      onboarding_step: TOTAL_STEPS - 1,
      onboarding_skipped_steps: skippedSteps,
    });
    if (allDone) {
      useAuthStore.setState(state => ({
        user: state.user ? { ...state.user, onboarding_completed: true } : null,
      }));
    }
    qc.invalidateQueries();
    navigate('/admin/appointments');
  };

  const nextFor = (stepNum: number) => isResuming ? () => completeSkipped(stepNum) : advance;
  const skipFor  = (stepNum: number) => isResuming ? undefined : () => skipStep(stepNum);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('onboarding.welcomeSubtitle')}</p>
        </div>

        <ProgressBar step={bid ? step + 1 : 0} />

        {!bid && <Step0BusinessName onCreated={handleBusinessCreated} />}
        {bid && step === 0 && <Step1Category onNext={handleCategory} initialTypeId={selectedBusinessTypeId ?? undefined} />}
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
            businessType={selectedBusinessType}
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
          <Step4StaffServices
            bid={bid}
            staffList={staffList}
            onNext={nextFor(4)}
            onBack={() => setStep(3)}
            onSkip={skipFor(4)}
          />
        )}
        {step === 5 && (
          ownerWorking || staffList.some(s => s.id) ? (
            <Step5Hours
              userId={userId}
              userName={userName}
              staffList={staffList}
              onNext={nextFor(5)}
              onBack={() => setStep(4)}
              onSkip={skipFor(5)}
            />
          ) : <Step6Done skippedCount={skippedSteps.length} onFinish={finishOnboarding} slug={bizSlug} />
        )}
        {step === 6 && <Step6Done skippedCount={skippedSteps.length} onFinish={finishOnboarding} slug={bizSlug} />}
      </div>
    </div>
  );
}
