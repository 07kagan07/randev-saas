import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface Stats {
  businesses: { total: number; active: number; inactive: number };
  appointments: { total: number };
  users: { total: number };
  plan_distribution: { plan: string; count: string }[];
}

const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' };
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-indigo-100 text-indigo-700',
  business: 'bg-amber-100 text-amber-700',
};

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery<{ data: Stats }>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const cards = [
    { label: 'Toplam İşletme',   value: stats?.businesses.total    ?? 0, sub: `${stats?.businesses.active ?? 0} aktif`, color: 'bg-indigo-500' },
    { label: 'Toplam Randevu',   value: stats?.appointments.total  ?? 0, sub: 'tüm zamanlar',                           color: 'bg-green-500'  },
    { label: 'Toplam Kullanıcı', value: stats?.users.total         ?? 0, sub: 'admin + personel',                       color: 'bg-purple-500' },
    { label: 'Pasif İşletme',    value: stats?.businesses.inactive ?? 0, sub: 'askıya alınmış',                         color: 'bg-red-500'    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Özeti</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className={`w-10 h-10 ${card.color} rounded-lg mb-3`} />
            <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString('tr-TR')}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Plan Dağılımı</h2>
        {stats?.plan_distribution?.length ? (
          <div className="flex flex-wrap gap-3">
            {stats.plan_distribution.map((p) => (
              <div key={p.plan} className={`px-4 py-2 rounded-lg ${PLAN_COLORS[p.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                <span className="font-semibold">{PLAN_LABELS[p.plan] ?? p.plan}</span>
                <span className="ml-2 text-sm">{p.count} işletme</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Henüz işletme yok.</p>
        )}
      </div>
    </div>
  );
}
