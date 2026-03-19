import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

const STATUS_LABEL: Record<string, string> = {
  pending:   'Bekliyor',
  approved:  'Onaylandı',
  cancelled: 'İptal',
  rejected:  'Reddedildi',
  completed: 'Tamamlandı',
  no_show:   'Gelmedi',
};
const STATUS_COLOR: Record<string, string> = {
  approved:  '#6366f1',
  completed: '#22c55e',
  pending:   '#eab308',
  cancelled: '#9ca3af',
  rejected:  '#ef4444',
  no_show:   '#f97316',
};

const HEATMAP_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['reports-overview', bid, from, to],
    queryFn: () => api.get(`/businesses/${bid}/reports/overview`, { params: { from, to } }).then(r => r.data),
    enabled: !!bid,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['reports-heatmap', bid],
    queryFn: () => api.get(`/businesses/${bid}/reports/heatmap`).then(r => r.data),
    enabled: !!bid,
  });

  const o = overviewData?.data;
  const hm = heatmapData?.data;

  const statusChartData = o?.by_status
    ? Object.entries(o.by_status).map(([k, v]) => ({
        name: STATUS_LABEL[k] ?? k,
        value: v as number,
        fill: STATUS_COLOR[k] ?? '#6366f1',
      }))
    : [];

  const dailyData: { date: string; count: number }[] = o?.daily ?? [];

  const staffData: { name: string; count: number }[] = o?.by_staff
    ? Object.entries(o.by_staff).map(([name, count]) => ({ name, count: count as number }))
    : [];

  const serviceData: { name: string; count: number }[] = o?.by_service
    ? Object.entries(o.by_service).map(([name, count]) => ({ name, count: count as number }))
    : [];

  const hmMatrix: number[][] = hm?.matrix ?? [];
  const hmMax = hmMatrix.length ? Math.max(1, ...hmMatrix.flat()) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="flex gap-3 items-center">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : !o ? (
        <div className="text-center py-16 text-gray-400 text-sm">Veri yok.</div>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Toplam Randevu',   value: o.total ?? 0 },
              { label: 'Tamamlanan',       value: o.by_status?.completed ?? 0 },
              { label: 'İptal/Red',        value: (o.by_status?.cancelled ?? 0) + (o.by_status?.rejected ?? 0) },
              { label: 'Toplam Gelir (₺)', value: Number(o.total_revenue ?? 0).toLocaleString('tr-TR') },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Günlük randevu trendi */}
          {dailyData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Günlük Randevu Trendi</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: any) => [v, 'Randevu']} labelFormatter={l => `Tarih: ${l}`} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Durum dağılımı */}
            {statusChartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Durum Dağılımı</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Randevu">
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Personele göre */}
            {staffData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Personele Göre</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={staffData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Randevu" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hizmete göre */}
            {serviceData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Hizmete Göre</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={serviceData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" name="Randevu" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Isı haritası */}
          {hmMatrix.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">Yoğunluk Haritası</h2>
              <p className="text-xs text-gray-400 mb-4">Hangi gün ve saatte en çok randevu alındığını gösterir.</p>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Saat başlıkları */}
                  <div className="flex gap-px ml-10 mb-1">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="w-5 text-center text-xs text-gray-400 shrink-0">
                        {h % 3 === 0 ? h : ''}
                      </div>
                    ))}
                  </div>
                  {hmMatrix.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex items-center gap-px mb-px">
                      <span className="w-9 text-xs text-gray-500 text-right pr-1 shrink-0">{HEATMAP_DAYS[dayIdx]}</span>
                      {row.map((val, h) => {
                        const intensity = val / hmMax;
                        const bg = val === 0
                          ? 'bg-gray-100'
                          : intensity < 0.25 ? 'bg-indigo-100'
                          : intensity < 0.5  ? 'bg-indigo-300'
                          : intensity < 0.75 ? 'bg-indigo-500'
                          : 'bg-indigo-700';
                        return (
                          <div
                            key={h}
                            title={`${HEATMAP_DAYS[dayIdx]} ${h}:00 — ${val} randevu`}
                            className={`w-5 h-5 rounded-sm shrink-0 ${bg}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">Az</span>
                    {['bg-gray-100', 'bg-indigo-100', 'bg-indigo-300', 'bg-indigo-500', 'bg-indigo-700'].map(c => (
                      <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
                    ))}
                    <span className="text-xs text-gray-400">Çok</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
