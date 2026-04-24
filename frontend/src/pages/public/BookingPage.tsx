import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, CheckCircle, Clock, Calendar, User, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import { useBusinessSocket } from '../../hooks/useBusinessSocket';
import PhoneInput from '../../components/shared/PhoneInput';
import { DEFAULT_COUNTRY, COUNTRIES } from '../../data/countries';
import { userLocale } from '../../utils/locale';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function WeekStrip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  // JS getDay(): 0=Sun,1=Mon...6=Sat → map to short names
  const DAY_KEYS_BY_JS = ['sunShort', 'monShort', 'tueShort', 'wedShort', 'thuShort', 'friShort', 'satShort'] as const;
  const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {days.map(d => {
        const ds = localDateStr(d);
        const isSelected = value === ds;
        const isToday = localDateStr(today) === ds;
        return (
          <button key={ds} onClick={() => onChange(ds)}
            className={`flex flex-col items-center flex-shrink-0 w-[72px] py-3 rounded-2xl border-2 transition-colors ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
            }`}>
            <span className={`text-xs font-semibold uppercase tracking-wide ${isSelected ? 'text-indigo-200' : isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
              {t(`common.days.${DAY_KEYS_BY_JS[d.getDay()]}`)}
            </span>
            <span className={`text-2xl font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
              {d.getDate()}
            </span>
            <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
              {t(`common.months.${MONTH_KEYS[d.getMonth()]}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type Step = 'service' | 'staff' | 'slot' | 'form' | 'done';
const STEP_ORDER: Step[] = ['service', 'staff', 'slot', 'form', 'done'];

function StepBar({ current }: { current: Step }) {
  const { t } = useTranslation();
  const STEP_META: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'service', label: t('booking.steps.service'), icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { key: 'staff',   label: t('booking.steps.staff'),   icon: <User className="w-3.5 h-3.5" /> },
    { key: 'slot',    label: t('booking.steps.date'),    icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'form',    label: t('booking.steps.info'),    icon: <Clock className="w-3.5 h-3.5" /> },
  ];
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEP_META.map((s, i) => {
        const done = currentIdx > i;
        const active = current === s.key;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s.icon}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-indigo-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function groupByCategory(services: any[], categoryOrder: string[], other: string): { category: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const s of services) {
    const cat = s.category || other;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  const ordered: { category: string; items: any[] }[] = [];
  for (const cat of categoryOrder) {
    if (map.has(cat)) { ordered.push({ category: cat, items: map.get(cat)! }); map.delete(cat); }
  }
  for (const [cat, items] of map) ordered.push({ category: cat, items });
  return ordered;
}

export default function BookingPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(() => localDateStr(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [lockedSlots, setLockedSlots] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ customer_name: '', customer_phone: DEFAULT_COUNTRY.dialCode });
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [createdAppt, setCreatedAppt] = useState<any>(null);

  const { data: bizData } = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => api.get(`/businesses/slug/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  const biz = bizData?.data;

  const bizCountryApplied = React.useRef(false);
  React.useEffect(() => {
    if (biz?.country && !bizCountryApplied.current) {
      bizCountryApplied.current = true;
      const found = COUNTRIES.find(c => c.code === biz.country);
      if (found) setForm(f => ({ ...f, customer_phone: found.dialCode }));
    }
  }, [biz?.country]);

  const { lockSlot, unlockSlot } = useBusinessSocket(biz?.id, {
    onSlotLocked: useCallback((e) => {
      setLockedSlots(prev => {
        const next = new Set(prev);
        next.add(e.slotUtc);
        return next;
      });
      setSelectedSlot(prev => prev === e.slotUtc ? null : prev);
    }, []),
    onSlotUnlocked: useCallback((e) => {
      setLockedSlots(prev => {
        const next = new Set(prev);
        next.delete(e.slotUtc);
        return next;
      });
    }, []),
  });

  const { data: bizTypeData } = useQuery({
    queryKey: ['business-type', biz?.business_type_id],
    queryFn: () => api.get(`/business-types/${biz.business_type_id}`).then(r => r.data?.data ?? r.data),
    enabled: !!biz?.business_type_id,
  });

  const bookingFormFields: any[] = bizTypeData?.booking_form_fields ?? [];

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['storefront-services', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/services`).then(r => r.data),
    enabled: !!biz?.id,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['storefront-staff', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/staff`).then(r => r.data),
    enabled: !!biz?.id && step === 'staff' && !(selectedService?.staff_services?.length > 0),
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', biz?.id, selectedService?.id, selectedStaff?.id, selectedDate],
    queryFn: () => api.get('/availability', {
      params: {
        business_id: biz.id,
        service_id: selectedService?.id,
        ...(selectedStaff?.id ? { staff_id: selectedStaff.id } : {}),
        date: selectedDate,
      },
    }).then(r => r.data),
    enabled: !!biz?.id && !!selectedService && step === 'slot',
  });

  const createAppt = useMutation({
    mutationFn: () => api.post('/appointments', {
      business_id: biz.id,
      service_id: selectedService.id,
      staff_id: selectedStaff?.id,
      start_at: selectedSlot,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      extra_fields: extraFields,
    }),
    onSuccess: (res) => {
      setCreatedAppt(res.data?.data);
      setStep('done');
    },
  });

  const services: any[] = (servicesData?.data ?? []).filter((s: any) => s.is_active);
  const categoryOrder: string[] = biz?.category_order ?? [];
  const serviceGroups = groupByCategory(services, categoryOrder, t('booking.other'));

  const staffList: any[] = selectedService?.staff_services?.length > 0
    ? selectedService.staff_services.map((ss: any) => ss.staff).filter((s: any) => s.is_active)
    : (staffData?.data ?? []).filter((s: any) => s.is_active);

  const slots: { start_utc: string; start_local: string; available: boolean }[] =
    slotsData?.data?.slots ?? [];

  const isManualApproval = biz?.approval_mode === 'manual_approve';

  const fmtSlot = (utc: string) =>
    new Date(utc).toLocaleString(userLocale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  if (!biz && !bizData) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {step === 'service' ? (
          <Link to={`/${slug}`} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></Link>
        ) : (
          <button onClick={() => {
            if (step === 'staff') setStep('service');
            else if (step === 'slot') setStep('staff');
            else if (step === 'form') setStep('slot');
          }} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <span className="font-semibold text-gray-800">{biz?.name ?? ''}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {step !== 'done' && <StepBar current={step} />}

        {/* ── Service ── */}
        {step === 'service' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">{t('booking.selectService')}</h2>
            {servicesLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : services.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">{t('booking.noServicesYet')}</p>
            ) : (
              <div className="space-y-5">
                {serviceGroups.map(({ category, items }) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">{category}</p>
                    <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {items.map(s => (
                        <button key={s.id}
                          onClick={() => { setSelectedService(s); setStep('staff'); }}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-indigo-50 transition-colors">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.duration_minutes} {t('common.minutes')}</p>
                          </div>
                          {s.show_price && s.price != null && (
                            <p className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                              {Number(s.price).toLocaleString()} ₺
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Staff ── */}
        {step === 'staff' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">{t('booking.selectStaff')}</h2>
            <p className="text-xs text-gray-400 mb-4">{t('booking.anyStaffHint')}</p>
            {staffLoading && !(selectedService?.staff_services?.length > 0) ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : (
              <div className="space-y-3">
                <button onClick={() => { setSelectedStaff(null); setStep('slot'); }}
                  className="w-full bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-400 px-4 py-3 text-left transition-colors">
                  <p className="font-medium text-gray-700 text-sm">{t('booking.anyStaff')}</p>
                  <p className="text-xs text-gray-400">{t('booking.anyStaffDesc')}</p>
                </button>
                {staffList.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStaff(s); setStep('slot'); }}
                    className="w-full bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-400 px-4 py-3 flex items-center gap-3 text-left transition-colors">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                      {(s.full_name || s.phone).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.full_name || s.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Date & Slot ── */}
        {step === 'slot' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">{t('booking.selectDateTime')}</h2>
            <div className="mb-5">
              <WeekStrip value={selectedDate} onChange={v => {
                if (selectedSlot) unlockSlot(selectedSlot, selectedService?.id);
                setSelectedDate(v);
                setSelectedSlot(null);
                setLockedSlots(new Set());
              }} />
            </div>
            {slotsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">{t('booking.noSlotsForDate')}</p>
                <p className="text-gray-300 text-xs mt-1">{t('booking.tryOtherDate')}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2">{t('booking.availableSlots', { count: slots.filter(s => s.available).length })}</p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot: any) => {
                    const isPast     = slot.reason === 'past';
                    const isFull     = !slot.available && !isPast;
                    const isRtLocked = lockedSlots.has(slot.start_utc);
                    const isDisabled = !slot.available || isRtLocked;
                    const isSelected = selectedSlot === slot.start_utc;
                    return (
                      <button key={slot.start_utc}
                        disabled={isDisabled}
                        onClick={async () => {
                          if (isDisabled) return;
                          if (selectedSlot && selectedSlot !== slot.start_utc) {
                            unlockSlot(selectedSlot, selectedService?.id);
                          }
                          setSelectedSlot(slot.start_utc);
                          await lockSlot(slot.start_utc, selectedService?.id, selectedService?.duration_minutes);
                        }}
                        className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors flex flex-col items-center leading-tight ${
                          isPast
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : isFull || isRtLocked
                            ? 'bg-red-50 border-red-100 text-red-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'
                        }`}>
                        <span>{slot.start_local}</span>
                        {(isFull || isRtLocked) && <span className="text-[10px] font-semibold">{t('booking.slotFull')}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {selectedSlot && (
              <button onClick={() => setStep('form')}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors">
                {t('booking.continueBtn')}
              </button>
            )}
          </div>
        )}

        {/* ── Form ── */}
        {step === 'form' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">{t('booking.yourDetails')}</h2>

            {/* Summary card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-indigo-400">{t('booking.serviceLabel')}</span>
                <span className="font-medium text-indigo-900">{selectedService?.name}</span>
              </div>
              {selectedStaff && (
                <div className="flex justify-between">
                  <span className="text-indigo-400">{t('booking.staffLabel')}</span>
                  <span className="font-medium text-indigo-900">{selectedStaff.full_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-indigo-400">{t('booking.dateTimeLabel')}</span>
                <span className="font-medium text-indigo-900">
                  {selectedSlot && fmtSlot(selectedSlot)}
                </span>
              </div>
              {selectedService?.show_price && selectedService?.price && (
                <div className="flex justify-between border-t border-indigo-100 pt-1.5 mt-1.5">
                  <span className="text-indigo-400">{t('booking.feeLabel')}</span>
                  <span className="font-semibold text-indigo-700">{Number(selectedService.price).toLocaleString()} ₺</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('booking.yourName')} <span className="text-red-500">*</span></label>
                <input value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('booking.namePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('booking.yourPhone')} <span className="text-red-500">*</span></label>
                <PhoneInput
                  value={form.customer_phone}
                  onChange={v => setForm(f => ({ ...f, customer_phone: v }))}
                />
              </div>

              {/* Business-type extra fields */}
              {bookingFormFields.map((field: any) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select value={extraFields[field.key] ?? ''}
                      onChange={e => setExtraFields(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{t('booking.selectOption')}</option>
                      {(field.options ?? []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={extraFields[field.key] ?? ''}
                      onChange={e => setExtraFields(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder} rows={3}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  ) : (
                    <input type={field.type} value={extraFields[field.key] ?? ''}
                      onChange={e => setExtraFields(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  )}
                </div>
              ))}

              {isManualApproval && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                  {t('booking.manualApprovalNote')}
                </div>
              )}

              <button onClick={() => createAppt.mutate()}
                disabled={
                  createAppt.isPending ||
                  !form.customer_name.trim() ||
                  form.customer_phone.length < 8 ||
                  bookingFormFields.some((f: any) => f.required && !extraFields[f.key]?.trim())
                }
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors">
                {createAppt.isPending ? t('booking.bookingButton') : t('booking.bookButton')}
              </button>
              {createAppt.isError && (
                <p className="text-red-600 text-xs text-center">{(createAppt.error as any)?.response?.data?.message ?? t('booking.errors.generic')}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${isManualApproval ? 'bg-amber-100' : 'bg-green-100'}`}>
              <CheckCircle className={`w-10 h-10 ${isManualApproval ? 'text-amber-500' : 'text-green-600'}`} />
            </div>

            {isManualApproval ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('booking.requestReceivedTitle')}</h2>
                <p className="text-gray-500 text-sm mb-1">{t('booking.pendingApprovalMsg')}</p>
                <p className="text-gray-400 text-xs mb-6">{t('booking.willNotifySms')}</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('booking.appointmentConfirmedTitle')}</h2>
                <p className="text-gray-500 text-sm mb-1">{t('booking.appointmentCreatedMsg')}</p>
                <p className="text-gray-400 text-xs mb-6">{t('booking.cancelViaSmsMsg')}</p>
              </>
            )}

            {/* Summary */}
            {createdAppt && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-left mb-6 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('booking.serviceLabel')}</span>
                  <span className="font-medium text-gray-800">{selectedService?.name}</span>
                </div>
                {selectedStaff && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('booking.staffLabel')}</span>
                    <span className="font-medium text-gray-800">{selectedStaff.full_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('booking.dateTimeLabel')}</span>
                  <span className="font-medium text-gray-800">
                    {selectedSlot && fmtSlot(selectedSlot)}
                  </span>
                </div>
                {bookingFormFields.filter((f: any) => extraFields[f.key]).map((f: any) => (
                  <div key={f.key} className="flex justify-between">
                    <span className="text-gray-400">{f.label}</span>
                    <span className="font-medium text-gray-800">{extraFields[f.key]}</span>
                  </div>
                ))}
              </div>
            )}

            <Link to={`/${slug}`}
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors">
              {t('booking.backToStore')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
