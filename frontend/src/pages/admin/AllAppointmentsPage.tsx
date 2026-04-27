import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import ApptCard, { isArchived } from '../../components/shared/ApptCard';
import { useBusinessSocket } from '../../hooks/useBusinessSocket';
import api from '../../services/api';
import { userLocale } from '../../utils/locale';

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AllAppointmentsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [staffFilter, setStaffFilter]   = useState('');
  const [showPast, setShowPast]         = useState(false);

  useBusinessSocket(bid, {
    onNewAppointment: () => qc.invalidateQueries({ queryKey: ['all-day-appts'], refetchType: 'all' }),
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

  /* Staff list for tabs */
  const { data: staffData } = useQuery({
    queryKey: ['all-appts-staff', bid],
    queryFn: () => api.get(`/businesses/${bid}/staff`).then(r => r.data),
    enabled: !!bid,
  });
  const staffList: any[] = (staffData?.data ?? []).filter((s: any) => s.is_active);

  /* Appointments for selected day */
  const { data, isLoading } = useQuery({
    queryKey: ['all-day-appts', bid, selectedDate, staffFilter],
    queryFn: () =>
      api.get('/appointments', {
        params: {
          businessId: bid,
          staff_id: staffFilter || undefined,
          from: selectedDate,
          to:   selectedDate,
          per_page: 100,
        },
      }).then(r => r.data),
    enabled: !!bid,
    refetchInterval: 30_000,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) =>
      api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-day-appts'] }),
  });

  const sorted: any[] = (data?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  const todayStr   = toDateStr(new Date());
  const isToday    = selectedDate === todayStr;
  const isPastDay  = selectedDate < todayStr;

  const upcoming = isPastDay ? [] : sorted.filter(a => !isArchived(a));
  const past     = isPastDay ? sorted : sorted.filter(a => isArchived(a));

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString(userLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      {/* Staff tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        <button
          onClick={() => { setStaffFilter(''); setShowPast(false); }}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
            staffFilter === ''
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          {t('appointments.filters.all')}
        </button>
        {staffList.map(s => (
          <button
            key={s.id}
            onClick={() => { setStaffFilter(s.id); setShowPast(false); }}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              staffFilter === s.id
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              staffFilter === s.id ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {s.full_name.charAt(0).toUpperCase()}
            </span>
            {s.full_name}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center mb-6">
        <button
          onClick={prevDay}
          className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <p className={`text-sm font-semibold capitalize ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
            {displayDate}
          </p>
        </div>
        <button
          onClick={nextDay}
          className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Appointments */}
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
            <ApptCard key={a.id} appt={a} actions="staff" showStaff
              onAction={(id, act) => action.mutate({ id, act })}
              isPending={action.isPending} />
          ))}

          {past.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowPast(v => !v)}
                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors mb-3"
              >
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
