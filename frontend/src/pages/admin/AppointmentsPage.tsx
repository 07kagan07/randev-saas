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

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'no_show', label: 'Gelmedi' },
];

export default function AdminAppointmentsPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', bid, statusFilter, dateFrom, dateTo, page],
    queryFn: () => api.get('/appointments', {
      params: {
        businessId: bid,
        status: statusFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        per_page: 20,
      },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Randevular</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
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
          <p className="text-gray-400 text-sm">Bu kriterlere uygun randevu bulunamadı.</p>
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
                      {new Date(a.start_at).toLocaleDateString('tr-TR')} —{' '}
                      {new Date(a.start_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {a.status === 'pending' && (
                      <>
                        <button
                          onClick={() => action.mutate({ id: a.id, act: 'approve' })}
                          disabled={action.isPending}
                          className="text-xs text-green-600 hover:text-green-800 px-3 py-1.5 border border-green-200 rounded-lg"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => action.mutate({ id: a.id, act: 'reject' })}
                          disabled={action.isPending}
                          className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg"
                        >
                          Reddet
                        </button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <>
                        <button
                          onClick={() => action.mutate({ id: a.id, act: 'complete' })}
                          disabled={action.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg"
                        >
                          Tamamlandı
                        </button>
                        <button
                          onClick={() => action.mutate({ id: a.id, act: 'no-show' })}
                          disabled={action.isPending}
                          className="text-xs text-orange-500 hover:text-orange-700 px-3 py-1.5 border border-orange-200 rounded-lg"
                        >
                          Gelmedi
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
              <span className="text-xs text-gray-500">Toplam {total} randevu</span>
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
