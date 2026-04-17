import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface Business {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  category: string | null;
  is_active: boolean;
  subscription_plan: 'free' | 'pro' | 'business';
  subscription_ends_at: string | null;
  created_at: string;
}

const PLAN_LABELS = { free: 'Free', pro: 'Pro', business: 'Business' };
const PLAN_COLORS: Record<string, string> = {
  free:     'bg-gray-100 text-gray-700 border-gray-200',
  pro:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  business: 'bg-amber-100 text-amber-700 border-amber-200',
};

type CreateForm = { business_name: string; owner_name: string; owner_phone: string; slug: string };
const emptyCreate: CreateForm = { business_name: '', owner_name: '', owner_phone: '', slug: '' };

export default function BusinessesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingPlan, setEditingPlan] = useState<{ id: string; current: string } | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', page, search, planFilter],
    queryFn: () => api.get('/admin/businesses', {
      params: { page, per_page: 20, search: search || undefined, plan: planFilter || undefined },
    }).then(r => r.data),
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.patch(`/admin/businesses/${id}/plan`, { plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setEditingPlan(null);
    },
  });

  const blockUser = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/block`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const createBusiness = useMutation({
    mutationFn: (form: CreateForm) => api.post('/auth/register', {
      business_name: form.business_name,
      owner_name: form.owner_name || undefined,
      owner_phone: form.owner_phone,
      slug: form.slug || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      setCreateError('');
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.message || 'İşletme oluşturulamadı.');
    },
  });

  const businesses: Business[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center justify-end mb-6">

        <button
          onClick={() => { setCreateOpen(true); setCreateForm(emptyCreate); setCreateError(''); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + İşletme Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="İşletme adı ara..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tüm Planlar</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">İşletme bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">İşletme</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.name}</p>
                      {b.phone && <p className="text-xs text-gray-400">{b.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.slug}</td>
                    <td className="px-4 py-3">
                      {editingPlan?.id === b.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={newPlan}
                            onChange={e => setNewPlan(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                          </select>
                          <button
                            onClick={() => updatePlan.mutate({ id: b.id, plan: newPlan })}
                            disabled={updatePlan.isPending}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                          >
                            Kaydet
                          </button>
                          <button onClick={() => setEditingPlan(null)} className="text-xs text-gray-400 hover:text-gray-600">İptal</button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditingPlan({ id: b.id, current: b.subscription_plan }); setNewPlan(b.subscription_plan); }}
                          className={`cursor-pointer inline-flex px-2 py-1 rounded-md border text-xs font-medium ${PLAN_COLORS[b.subscription_plan]}`}
                        >
                          {PLAN_LABELS[b.subscription_plan]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {b.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(b.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`http://localhost:8080/${b.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-xs mr-3"
                      >
                        Vitrin
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">{meta.total} işletme</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                ← Önceki
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {meta.total_pages}</span>
              <button
                disabled={page >= meta.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Create Business Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">İşletme Oluştur</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı *</label>
                <input
                  value={createForm.business_name}
                  onChange={e => setCreateForm(f => ({ ...f, business_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Örnek Kuaför"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sahip Adı</label>
                <input
                  value={createForm.owner_name}
                  onChange={e => setCreateForm(f => ({ ...f, owner_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ahmet Yılmaz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input
                  value={createForm.owner_phone}
                  onChange={e => setCreateForm(f => ({ ...f, owner_phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+905xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (opsiyonel)</label>
                <input
                  value={createForm.slug}
                  onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ornek-kuafor"
                />
                <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa işletme adından otomatik oluşturulur.</p>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <button
                onClick={() => createBusiness.mutate(createForm)}
                disabled={createBusiness.isPending || !createForm.business_name || !createForm.owner_phone}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-lg"
              >
                {createBusiness.isPending ? 'Oluşturuluyor...' : 'İşletme Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
