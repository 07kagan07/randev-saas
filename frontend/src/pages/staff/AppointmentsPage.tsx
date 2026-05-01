import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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

export default function StaffAppointmentsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const bid = user?.business_id;
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || toDateStr(new Date()));
  const [showPast, setShowPast] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(() => searchParams.get('highlight'));

  useBusinessSocket(bid, {
    onNewAppointment: () => qc.invalidateQueries({ queryKey: ['staff-day-appts'], refetchType: 'all' }),
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
    queryKey: ['staff-day-appts', bid, selectedDate],
    queryFn: () => api.get('/appointments', {
      params: { businessId: bid, from: selectedDate, to: selectedDate, per_page: 100 },
    }).then(r => r.data),
    enabled: !!bid,
    refetchInterval: 30_000,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-day-appts'] }),
  });

  // Auto-expand past section if highlighted appointment is archived
  useEffect(() => {
    if (!activeHighlight || !data) return;
    const target = (data?.data ?? []).find((a: any) => a.id === activeHighlight);
    if (target && isArchived(target)) setShowPast(true);
  }, [data, activeHighlight]);

  // Scroll to highlighted appointment once it's rendered
  useEffect(() => {
    if (!activeHighlight) return;
    const el = document.getElementById(`appt-${activeHighlight}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timer = setTimeout(() => setActiveHighlight(null), 3500);
    return () => clearTimeout(timer);
  }, [activeHighlight, showPast, data]);

  const sorted: any[] = (data?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
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
            <div
              key={a.id}
              id={`appt-${a.id}`}
              className={activeHighlight === a.id
                ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-xl transition-shadow duration-500'
                : ''}
            >
              <ApptCard appt={a} actions="staff"
                onAction={(id, act) => action.mutate({ id, act })}
                isPending={action.isPending} />
            </div>
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
                <div className="space-y-3">
                  {past.map((a: any) => (
                    <div
                      key={a.id}
                      id={`appt-${a.id}`}
                      className={activeHighlight === a.id
                        ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-xl transition-shadow duration-500'
                        : 'opacity-60'}
                    >
                      <ApptCard appt={a} actions="staff"
                        onAction={(id, act) => action.mutate({ id, act })}
                        isPending={action.isPending} />
                    </div>
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
