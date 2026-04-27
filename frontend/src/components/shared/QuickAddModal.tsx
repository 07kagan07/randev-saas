import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import PhoneInput from './PhoneInput';
import { fmtTime } from '../../utils/locale';

interface Props {
  businessId: string;
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  queryKeyPrefix: string;
}

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const QUICK_COUNT = 3;

/** Services sorted by recent appointment frequency */
function useSortedServices(businessId: string, services: any[]) {
  const { data: recentAppts } = useQuery({
    queryKey: ['quick-recent-appts', businessId],
    queryFn: () => api.get('/appointments', {
      params: { businessId, per_page: 50 },
    }).then(r => r.data),
    enabled: !!businessId && services.length > 0,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const appts: any[] = recentAppts?.data ?? [];
    const freq: Record<string, number> = {};
    for (const a of appts) {
      if (a.service_id) freq[a.service_id] = (freq[a.service_id] ?? 0) + 1;
    }
    return [...services].sort((a, b) => (freq[b.id] ?? 0) - (freq[a.id] ?? 0));
  }, [services, recentAppts]);
}

/** Services grouped by category, respecting category_order */
function groupByCategory(services: any[], categoryOrder: string[]): { category: string; items: any[] }[] {
  const map: Record<string, any[]> = {};
  for (const s of services) {
    const cat = s.category || '—';
    if (!map[cat]) map[cat] = [];
    map[cat].push(s);
  }
  const ordered = categoryOrder.filter(c => map[c]);
  const rest = Object.keys(map).filter(c => !categoryOrder.includes(c));
  return [...ordered, ...rest].map(cat => ({ category: cat, items: map[cat] }));
}

/** Single selectable chip */
function Chip({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border transition-colors text-left ${
        active
          ? 'bg-indigo-600 border-indigo-600 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
      }`}
    >
      <span className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</span>
      {sub && <span className={`text-[10px] mt-0.5 ${active ? 'text-indigo-200' : 'text-gray-400'}`}>{sub}</span>}
    </button>
  );
}

/** Quick chips (top N) + expand button that opens a categorized sheet */
function ServiceSelect({
  services,
  categoryOrder,
  value,
  onChange,
}: {
  services: any[];
  categoryOrder: string[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const sorted = useSortedServices('', services); // sorted inside parent, passed pre-sorted
  const [sheetOpen, setSheetOpen] = useState(false);

  const quick = sorted.slice(0, QUICK_COUNT);
  const hasMore = sorted.length > QUICK_COUNT;
  const groups = groupByCategory(services, categoryOrder);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {quick.map(s => (
          <Chip
            key={s.id}
            label={s.name}
            sub={`${s.duration_minutes}${t('common.minutes')}${s.price ? ` · ${Number(s.price).toLocaleString()} ₺` : ''}`}
            active={s.id === value}
            onClick={() => onChange(s.id === value ? '' : s.id)}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-medium"
          >
            +{sorted.length - QUICK_COUNT}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl shadow-2xl max-h-[75dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <p className="font-semibold text-gray-900 text-sm">{t('booking.steps.service')}</p>
              <button onClick={() => setSheetOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-4">
              {groups.map(({ category, items }) => (
                <div key={category}>
                  <p className="px-5 pt-4 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{category}</p>
                  {items.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { onChange(s.id === value ? '' : s.id); setSheetOpen(false); }}
                      className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
                        s.id === value ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${s.id === value ? 'text-indigo-700' : 'text-gray-900'}`}>{s.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.duration_minutes}{t('common.minutes')}
                          {s.price ? ` · ${Number(s.price).toLocaleString()} ₺` : ''}
                        </p>
                      </div>
                      {s.id === value && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Staff quick chips + expand */
function StaffSelect({ staffList, value, onChange }: { staffList: any[]; value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const quick = staffList.slice(0, QUICK_COUNT);
  const hasMore = staffList.length > QUICK_COUNT;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {quick.map(s => (
          <Chip
            key={s.id}
            label={s.full_name}
            active={s.id === value}
            onClick={() => onChange(s.id === value ? '' : s.id)}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-medium"
          >
            +{staffList.length - QUICK_COUNT}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl shadow-2xl max-h-[60dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <p className="font-semibold text-gray-900 text-sm">{t('booking.steps.staff')}</p>
              <button onClick={() => setSheetOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-2">
              {staffList.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id === value ? '' : s.id); setSheetOpen(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                    s.id === value ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.id === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <p className={`text-sm font-medium ${s.id === value ? 'text-indigo-700' : 'text-gray-900'}`}>{s.full_name}</p>
                  </div>
                  {s.id === value && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function QuickAddModal({ businessId, isAdmin, currentUserId, onClose, queryKeyPrefix }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const today = localDateStr(new Date());

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId]     = useState(isAdmin ? '' : currentUserId);
  const [date, setDate]           = useState(today);
  const [slot, setSlot]           = useState('');
  const [manualTime, setManualTime] = useState('');
  const [useManual, setUseManual]   = useState(false);
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  /* ── Services ── */
  const { data: servicesData } = useQuery({
    queryKey: ['quick-services', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/services`).then(r => r.data),
    enabled: !!businessId,
  });
  const services: any[] = (servicesData?.data ?? []).filter((s: any) => s.is_active);

  /* ── Business (for category_order) ── */
  const { data: bizData } = useQuery({
    queryKey: ['quick-biz', businessId],
    queryFn: () => api.get(`/businesses/${businessId}`).then(r => r.data),
    enabled: !!businessId,
    staleTime: 300_000,
  });
  const categoryOrder: string[] = bizData?.data?.category_order ?? [];

  /* ── Recent appointments → service frequency sort ── */
  const { data: recentData } = useQuery({
    queryKey: ['quick-recent-appts', businessId],
    queryFn: () => api.get('/appointments', { params: { businessId, per_page: 50 } }).then(r => r.data),
    enabled: !!businessId && services.length > 0,
    staleTime: 60_000,
  });

  const sortedServices = useMemo(() => {
    const appts: any[] = recentData?.data ?? [];
    const freq: Record<string, number> = {};
    for (const a of appts) {
      if (a.service_id) freq[a.service_id] = (freq[a.service_id] ?? 0) + 1;
    }
    const totalWithService = Object.values(freq).reduce((s, n) => s + n, 0);
    if (totalWithService < 5) return services; // yeterli veri yok → API sırası (admin tanımlı)
    return [...services].sort((a, b) => (freq[b.id] ?? 0) - (freq[a.id] ?? 0));
  }, [services, recentData]);

  /* Auto-select most frequent service once list is ready */
  useEffect(() => {
    if (sortedServices.length > 0 && !serviceId) {
      setServiceId(sortedServices[0].id);
    }
  }, [sortedServices]);

  /* ── Staff (admin only) ── */
  const { data: staffData } = useQuery({
    queryKey: ['quick-staff', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/staff`).then(r => r.data),
    enabled: !!businessId && isAdmin,
  });
  const staffList: any[] = (staffData?.data ?? []).filter((s: any) => s.is_active);

  /* ── Availability slots ── */
  const slotsEnabled = !!serviceId && !!date && (isAdmin ? !!staffId : true);
  const { data: availData, isFetching: slotsFetching } = useQuery({
    queryKey: ['quick-availability', businessId, serviceId, staffId, date],
    queryFn: () => api.get('/availability', {
      params: { business_id: businessId, service_id: serviceId, staff_id: staffId || undefined, date },
    }).then(r => r.data),
    enabled: slotsEnabled,
  });
  const slots: any[] = (availData?.data?.slots ?? []).filter((s: any) => s.available);

  useEffect(() => { setSlot(''); setManualTime(''); setUseManual(false); }, [serviceId, staffId, date]);

  /* ── Submit ── */
  const create = useMutation({
    mutationFn: () => {
      const chosenTime = useManual ? manualTime : slot;
      const start_at = new Date(`${date}T${chosenTime}:00`).toISOString();
      return api.post('/appointments/walk-in', {
        business_id: businessId,
        service_id: serviceId,
        staff_id: staffId || undefined,
        customer_name: customerName.trim(),
        customer_phone: customerPhone,
        start_at,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeyPrefix] });
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    },
  });

  const selectedService = services.find(s => s.id === serviceId);
  const chosenTime = useManual ? manualTime : slot;
  const canSubmit =
    !!serviceId &&
    (isAdmin ? !!staffId : true) &&
    !!date &&
    !!chosenTime &&
    customerName.trim().length >= 2 &&
    customerPhone.length >= 8 &&
    !create.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900">{t('appointments.walkInTitle')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('appointments.walkInSubtitle')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-sm font-medium text-gray-700">{t('appointments.createSuccess')}</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Service */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">{t('booking.steps.service')}</label>
              <ServiceSelect
                services={sortedServices}
                categoryOrder={categoryOrder}
                value={serviceId}
                onChange={setServiceId}
              />
            </div>

            {/* Staff (admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">{t('booking.steps.staff')}</label>
                <StaffSelect staffList={staffList} value={staffId} onChange={setStaffId} />
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('appointments.selectDate')}</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800"
              />
            </div>

            {/* Time slots */}
            {slotsEnabled && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600">{t('appointments.availableSlots')}</label>
                  <button
                    type="button"
                    onClick={() => { setUseManual(v => !v); setSlot(''); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {t('appointments.manualTime')}
                  </button>
                </div>

                {useManual ? (
                  <input
                    type="time"
                    value={manualTime}
                    onChange={e => setManualTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                ) : slotsFetching ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">{t('appointments.noSlots')}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map((s: any) => {
                      const timeLabel = fmtTime(s.start_utc);
                      const isSelected = slot === s.start_local?.slice(11, 16);
                      return (
                        <button
                          key={s.start_utc}
                          type="button"
                          onClick={() => setSlot(s.start_local?.slice(11, 16) ?? '')}
                          className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          <Clock className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`} />
                          {timeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Customer name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('appointments.customerName')}</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder={t('appointments.customerNamePlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-300"
              />
            </div>

            {/* Customer phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('appointments.customerPhone')}</label>
              <PhoneInput value={customerPhone} onChange={setCustomerPhone} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t('appointments.walkInNotes')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('appointments.walkInNotesPlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-300"
              />
            </div>

            {/* Summary */}
            {selectedService && chosenTime && (
              <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700">
                <span className="font-medium">{selectedService.name}</span>
                {' · '}
                {new Date(`${date}T${chosenTime}:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                {' '}
                {chosenTime}
              </div>
            )}

            {create.isError && (
              <p className="text-red-600 text-xs">
                {(create.error as any)?.response?.data?.error?.message ?? t('common.errorOccurred')}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        {!success && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => create.mutate()}
              disabled={!canSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              {create.isPending ? t('appointments.creating') : t('appointments.createAppointment')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
