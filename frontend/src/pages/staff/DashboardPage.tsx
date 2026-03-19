import React from 'react';
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

export default function StaffDashboardPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id;
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['staff-today-appts', bid, today],
    queryFn: () => api.get('/appointments', {
      params: { businessId: bid, from: today, to: today, per_page: 50 },
    }).then(r => r.data),
    enabled: !!bid,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-today-appts'] }),
  });

  const appointments: any[] = (data?.data ?? []).filter((a: any) => a.staff?.id === user?.id || !user?.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bugünün Randevuları</h1>
      <p className="text-sm text-gray-500 mb-4">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Bugün randevu yok.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{a.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.customer_phone} · {a.service?.name}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">
                      {new Date(a.start_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(a.end_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {a.status === 'approved' && (
                      <button
                        onClick={() => action.mutate({ id: a.id, act: 'complete' })}
                        disabled={action.isPending}
                        className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg"
                      >
                        Tamamlandı
                      </button>
                    )}
                    {a.status === 'approved' && (
                      <button
                        onClick={() => action.mutate({ id: a.id, act: 'no-show' })}
                        disabled={action.isPending}
                        className="text-xs text-orange-500 hover:text-orange-700 px-3 py-1.5 border border-orange-200 rounded-lg"
                      >
                        Gelmedi
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
