import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor', approved: 'Onaylandı', cancelled: 'İptal',
  rejected: 'Reddedildi', completed: 'Tamamlandı', no_show: 'Gelmedi',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-orange-100 text-orange-700',
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function StaffAppointmentsPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id;
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStr(d));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateStr(d));
  };

  const { data, isLoading } = useQuery({
    queryKey: ['staff-day-appts', bid, selectedDate],
    queryFn: () => api.get('/appointments', {
      params: { businessId: bid, from: selectedDate, to: selectedDate, per_page: 100 },
    }).then(r => r.data),
    enabled: !!bid,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-day-appts'] }),
  });

  const appts: any[] = (data?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const todayStr = toDateStr(new Date());
  const isToday = selectedDate === todayStr;

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      {/* Başlık + navigasyon */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Randevular</h1>
          <p className={`text-sm mt-0.5 capitalize ${isToday ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
            {isToday ? 'Bugün · ' : ''}{displayDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">‹</button>
          <button
            onClick={() => setSelectedDate(todayStr)}
            disabled={isToday}
            className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs disabled:opacity-40"
          >
            Bugün
          </button>
          <button onClick={nextDay} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">›</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : appts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Bu gün için randevu yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                {/* Saat */}
                <div className="text-center w-14 shrink-0">
                  <p className="text-lg font-bold text-indigo-600">
                    {new Date(a.start_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">{a.service?.duration_minutes} dk</p>
                </div>

                {/* Bilgi */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{a.customer_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.customer_phone}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    <span className="font-medium">{a.service?.name}</span>
                    {a.service?.price && (
                      <span className="text-gray-400 ml-1">· {Number(a.service.price).toLocaleString('tr-TR')} ₺</span>
                    )}
                  </p>
                </div>

                {/* Durum */}
                <div className="text-right shrink-0">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
              </div>

              {/* Aksiyon butonları */}
              {a.status === 'approved' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => action.mutate({ id: a.id, act: 'complete' })}
                    disabled={action.isPending}
                    className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    Tamamlandı
                  </button>
                  <button
                    onClick={() => action.mutate({ id: a.id, act: 'no-show' })}
                    disabled={action.isPending}
                    className="flex-1 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                  >
                    Gelmedi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
