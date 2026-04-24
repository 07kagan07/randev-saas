import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import ApptCard, { isArchived } from '../../components/shared/ApptCard';
import { useBusinessSocket } from '../../hooks/useBusinessSocket';
import { useAdminMode } from '../../hooks/useAdminMode';
import api from '../../services/api';
import { userLocale, fmtTime } from '../../utils/locale';

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function StaffView({ bid }: { bid: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [showPast, setShowPast] = useState(false);

  useBusinessSocket(bid, {
    onNewAppointment: () => qc.invalidateQueries({ queryKey: ['admin-day-appts'] }),
  });

  const prevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStr(d));
    setShowPast(false);
  };
  const nextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateStr(d));
    setShowPast(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-day-appts', bid, selectedDate],
    queryFn: () =>
      api.get('/appointments', {
        params: { businessId: bid, from: selectedDate, to: selectedDate, per_page: 100 },
      }).then(r => r.data),
    enabled: !!bid,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) =>
      api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-day-appts'] }),
  });

  const sorted: any[] = (data?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  const todayStr = toDateStr(new Date());
  const isToday = selectedDate === todayStr;
  const isPastDay = selectedDate < todayStr;

  const upcoming = isPastDay ? [] : sorted.filter(a => !isArchived(a));
  const past = isPastDay ? sorted : sorted.filter(a => isArchived(a));

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString(userLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <div className="flex items-center mb-6">
        <button onClick={prevDay} className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <p className={`text-sm font-semibold capitalize ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{displayDate}</p>
        </div>
        <button onClick={nextDay} className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">{t('appointments.noAppointments')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length === 0 && !isPastDay && (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 text-sm">{t('appointments.noUpcoming')}</p>
            </div>
          )}

          {upcoming.map((a: any) => (
            <ApptCard key={a.id} appt={a} actions="staff"
              onAction={(id, act) => action.mutate({ id, act })}
              isPending={action.isPending} />
          ))}

          {past.length > 0 && (
            <div className="pt-2">
              <button onClick={() => setShowPast(v => !v)}
                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors mb-3">
                <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} />
                {isPastDay
                  ? t('appointments.allOf', { count: past.length })
                  : t('appointments.past', { count: past.length })}
              </button>
              {showPast && (
                <div className="space-y-3 opacity-60">
                  {past.map((a: any) => (
                    <ApptCard key={a.id} appt={a} actions="staff"
                      onAction={(id, act) => action.mutate({ id, act })}
                      isPending={action.isPending} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminView({ bid }: { bid: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const today = toDateStr(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [page, setPage] = useState(1);

  const STATUS_FILTERS = [
    { value: '', label: t('appointments.filters.all') },
    { value: 'pending', label: t('appointments.filters.pending') },
    { value: 'approved', label: t('appointments.filters.approved') },
    { value: 'completed', label: t('appointments.filters.completed') },
    { value: 'cancelled', label: t('appointments.filters.cancelled') },
    { value: 'rejected', label: t('appointments.filters.rejected') },
    { value: 'no_show', label: t('appointments.filters.no_show') },
  ];

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    no_show: 'bg-orange-100 text-orange-700',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', bid, statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      api.get('/appointments', {
        params: { businessId: bid, status: statusFilter || undefined, from: dateFrom || undefined, to: dateTo || undefined, page, per_page: 20 },
      }).then(r => r.data),
    enabled: !!bid,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) =>
      api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-appointments'] }),
  });

  const appointments: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('appointments.from')}</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('appointments.to')}</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('appointments.title')}</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">{t('appointments.noAppointments')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{a.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.customer_phone} · {a.service?.name} · {a.staff?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(a.start_at).toLocaleDateString(userLocale)} — {fmtTime(a.start_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
                      {t(`appointments.status.${a.status}`, { defaultValue: a.status })}
                    </span>
                    {a.status === 'pending' && (
                      <>
                        <button onClick={() => action.mutate({ id: a.id, act: 'approve' })} disabled={action.isPending}
                          className="text-xs text-green-600 hover:text-green-800 px-3 py-1.5 border border-green-200 rounded-lg">
                          {t('appointments.approve')}
                        </button>
                        <button onClick={() => action.mutate({ id: a.id, act: 'reject' })} disabled={action.isPending}
                          className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg">
                          {t('appointments.reject')}
                        </button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <>
                        <button onClick={() => action.mutate({ id: a.id, act: 'complete' })} disabled={action.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg">
                          {t('appointments.complete')}
                        </button>
                        <button onClick={() => action.mutate({ id: a.id, act: 'no-show' })} disabled={action.isPending}
                          className="text-xs text-orange-500 hover:text-orange-700 px-3 py-1.5 border border-orange-200 rounded-lg">
                          {t('appointments.noShow')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">{t('appointments.total', { count: total })}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹</button>
                <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAppointmentsPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const mode = useAdminMode();

  return mode === 'staff' ? <StaffView bid={bid} /> : <AdminView bid={bid} />;
}
