import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useBusinessSocket } from '../../hooks/useBusinessSocket';
import { userLocale } from '../../utils/locale';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function WeekStrip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const MON_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

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
            className={`flex flex-col items-center flex-shrink-0 w-[64px] py-2.5 rounded-xl border-2 transition-colors ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
            }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-indigo-200' : isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
              {t(`common.days.${DAY_KEYS[d.getDay()]}Short`)}
            </span>
            <span className={`text-xl font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
              {d.getDate()}
            </span>
            <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
              {t(`common.months.${MON_KEYS[d.getMonth()]}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ApptInfo {
  id: string;
  customer_name: string;
  start_at: string;
  end_at: string;
  status: string;
  service_id: string;
  service: { name: string; duration_minutes: number };
  staff: { id: string; full_name: string | null };
  business: { id: string; name: string; slug: string; timezone: string };
  action_token_expires_at: string | null;
  action_token_used: boolean;
}

type PageState = 'loading' | 'invalid' | 'used' | 'expired' | 'wrong_status' | 'confirm_cancel' | 'confirm_reschedule' | 'submitting' | 'success_cancel' | 'success_reschedule' | 'error';

export default function AppointmentActionPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token  = params.get('token');
  const action = params.get('action') as 'cancel' | 'reschedule' | null;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [appt, setAppt] = useState<ApptInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedDate, setSelectedDate] = useState(() => localDateStr(new Date()));
  const [slots, setSlots] = useState<{ start_utc: string; start_local: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [lockedSlots, setLockedSlots] = useState<Set<string>>(new Set());

  const { lockSlot, unlockSlot } = useBusinessSocket(
    pageState === 'confirm_reschedule' ? appt?.business.id : undefined,
    {
      onSlotLocked: useCallback((e) => {
        setLockedSlots(prev => { const s = new Set(prev); s.add(e.slotUtc); return s; });
        setSelectedSlot(prev => prev === e.slotUtc ? null : prev);
      }, []),
      onSlotUnlocked: useCallback((e) => {
        setLockedSlots(prev => { const s = new Set(prev); s.delete(e.slotUtc); return s; });
      }, []),
    }
  );

  useEffect(() => {
    if (!token) { setPageState('invalid'); return; }
    api.get('/appointments/action', { params: { token } })
      .then(r => {
        const data: ApptInfo = r.data?.data;
        setAppt(data);
        if (data.action_token_used) { setPageState('used'); return; }
        if (data.action_token_expires_at && new Date() > new Date(data.action_token_expires_at)) {
          setPageState('expired'); return;
        }
        if (data.status !== 'approved') { setPageState('wrong_status'); return; }
        setPageState(action === 'cancel' ? 'confirm_cancel' : 'confirm_reschedule');
      })
      .catch(() => setPageState('invalid'));
  }, [token, action]);

  const changeDate = useCallback((date: string) => {
    if (selectedSlot && appt) unlockSlot(selectedSlot, appt.service_id);
    setSelectedSlot(null);
    setLockedSlots(new Set());
    setSelectedDate(date);
  }, [selectedSlot, appt, unlockSlot]);

  const fetchSlots = useCallback(async (date: string) => {
    if (!appt) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const r = await api.get('/availability', {
        params: { business_id: appt.business.id, service_id: appt.service_id, staff_id: appt.staff.id, date },
      });
      setSlots(r.data?.data?.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [appt]);

  useEffect(() => {
    if (pageState === 'confirm_reschedule' && appt) fetchSlots(selectedDate);
  }, [selectedDate, pageState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    setPageState('submitting');
    try {
      await api.post('/appointments/action', { token, action: 'cancel' });
      setPageState('success_cancel');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error?.message ?? t('common.errorOccurred'));
      setPageState('error');
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot || !appt) return;
    setPageState('submitting');
    const dt = new Date(selectedSlot);
    const reschedule_date = localDateStr(dt);
    const reschedule_time = dt.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit', timeZone: appt.business.timezone ?? 'Europe/Istanbul' });
    try {
      await api.post('/appointments/action', { token, action: 'reschedule', reschedule_date, reschedule_time });
      unlockSlot(selectedSlot, appt.service_id);
      setPageState('success_reschedule');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error?.message ?? t('common.errorOccurred'));
      setPageState('error');
    }
  };

  const apptDateStr = appt
    ? new Date(appt.start_at).toLocaleString(userLocale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {pageState === 'loading' && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          </div>
        )}

        {pageState === 'invalid' && (
          <StatusCard icon={<XCircle className="w-10 h-10 text-red-400" />}
            title={t('appointmentAction.invalidLink')} desc={t('appointmentAction.invalidLinkDesc')} bg="bg-red-50" />
        )}

        {pageState === 'used' && (
          <StatusCard icon={<AlertTriangle className="w-10 h-10 text-amber-400" />}
            title={t('appointmentAction.usedLink')} desc={t('appointmentAction.usedLinkDesc')} bg="bg-amber-50" />
        )}

        {pageState === 'expired' && (
          <StatusCard icon={<AlertTriangle className="w-10 h-10 text-amber-400" />}
            title={t('appointmentAction.expiredLink')} desc={t('appointmentAction.expiredLinkDesc')} bg="bg-amber-50" biz={appt?.business} />
        )}

        {pageState === 'wrong_status' && (
          <StatusCard icon={<AlertTriangle className="w-10 h-10 text-amber-400" />}
            title={t('appointmentAction.invalidStatus')}
            desc={t('appointmentAction.invalidStatusDesc', { status: appt?.status })} bg="bg-amber-50" />
        )}

        {pageState === 'confirm_cancel' && appt && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-5 border-b border-red-100">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">{appt.business.name}</p>
              <h1 className="text-lg font-bold text-gray-900">{t('appointments.cancelTitle')}</h1>
            </div>
            <div className="px-6 py-5">
              <ApptSummary appt={appt} dateStr={apptDateStr} />
              <p className="text-sm text-gray-500 mt-4">{t('appointments.cancelConfirm')}</p>
              <button onClick={handleCancel}
                className="w-full mt-5 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors">
                {t('common.confirm')}
              </button>
              <button onClick={() => window.history.back()}
                className="w-full mt-2 py-3 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                {t('common.dismiss')}
              </button>
            </div>
          </div>
        )}

        {pageState === 'confirm_reschedule' && appt && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-indigo-50 px-6 py-5 border-b border-indigo-100">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">{appt.business.name}</p>
              <h1 className="text-lg font-bold text-gray-900">{t('appointments.status.rescheduled')}</h1>
            </div>
            <div className="px-6 py-5">
              <ApptSummary appt={appt} dateStr={apptDateStr} />
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t('booking.selectDate')}</p>
                <WeekStrip value={selectedDate} onChange={changeDate} />
                <div className="mt-4">
                  {slotsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">{t('booking.noSlots')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(slot => {
                        const isLocked = !slot.available || lockedSlots.has(slot.start_utc);
                        const isSelected = selectedSlot === slot.start_utc;
                        return (
                          <button key={slot.start_utc}
                            disabled={isLocked}
                            onClick={async () => {
                              if (isLocked) return;
                              if (selectedSlot && selectedSlot !== slot.start_utc) unlockSlot(selectedSlot, appt.service_id);
                              setSelectedSlot(slot.start_utc);
                              await lockSlot(slot.start_utc, appt.service_id, appt.service.duration_minutes);
                            }}
                            className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors flex flex-col items-center leading-tight ${
                              isLocked
                                ? 'bg-red-50 border-red-100 text-red-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'
                            }`}>
                            <span>{slot.start_local}</span>
                            {isLocked && <span className="text-[10px] font-semibold">{t('booking.slotFull')}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleReschedule} disabled={!selectedSlot}
                className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white font-semibold py-3 rounded-xl transition-colors">
                {t('common.confirm')}
              </button>
              <button onClick={() => window.history.back()}
                className="w-full mt-2 py-3 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                {t('common.dismiss')}
              </button>
            </div>
          </div>
        )}

        {pageState === 'submitting' && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          </div>
        )}

        {pageState === 'success_cancel' && (
          <StatusCard icon={<CheckCircle className="w-10 h-10 text-green-500" />}
            title={t('appointmentAction.cancelledTitle')} desc={t('appointmentAction.cancelledDesc')} bg="bg-green-50" biz={appt?.business} />
        )}

        {pageState === 'success_reschedule' && (
          <StatusCard icon={<CheckCircle className="w-10 h-10 text-green-500" />}
            title={t('appointmentAction.rescheduledTitle')} desc={t('appointmentAction.rescheduledDesc')} bg="bg-green-50" biz={appt?.business} />
        )}

        {pageState === 'error' && (
          <StatusCard icon={<XCircle className="w-10 h-10 text-red-400" />}
            title={t('appointmentAction.errorTitle')} desc={errorMsg} bg="bg-red-50" biz={appt?.business}
            retry={() => setPageState(action === 'cancel' ? 'confirm_cancel' : 'confirm_reschedule')} />
        )}

      </div>
    </div>
  );
}

function ApptSummary({ appt, dateStr }: { appt: ApptInfo; dateStr: string }) {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-400">{t('nav.services')}</span>
        <span className="font-medium text-gray-800">{appt.service.name}</span>
      </div>
      {appt.staff.full_name && (
        <div className="flex justify-between">
          <span className="text-gray-400">{t('nav.staff')}</span>
          <span className="font-medium text-gray-800">{appt.staff.full_name}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-400">{t('booking.selectDate')}</span>
        <span className="font-medium text-gray-800">{dateStr}</span>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, desc, bg, biz, retry }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg: string;
  biz?: { name: string; slug: string } | null;
  retry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
      <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center mx-auto mb-4`}>
        {icon}
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm mb-6">{desc}</p>
      {retry && (
        <button onClick={retry} className="w-full mb-3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
          {t('common.retry')}
        </button>
      )}
      {biz && (
        <Link to={`/${biz.slug}`} className="inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          {biz.name} → {t('booking.title')}
        </Link>
      )}
    </div>
  );
}
