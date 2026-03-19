import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
}

type FormState = { name: string; duration_minutes: number; price: number; category: string };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// Bileşen dışarıda tanımlı — her render'da yeni referans oluşmaz, focus kaybolmaz
function ServiceForm({
  form, setForm, existingCategories, onSubmit, isPending,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  existingCategories: string[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Adı</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Saç Kesimi"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dk)</label>
          <input
            type="number"
            min={5}
            value={form.duration_minutes}
            onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori (opsiyonel)</label>
        <input
          list="category-suggestions"
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={existingCategories.length ? 'Seçin veya yazın...' : 'Saç, Tırnak...'}
        />
        <datalist id="category-suggestions">
          {existingCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
        {existingCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {existingCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.category === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onSubmit}
        disabled={isPending || !form.name}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-lg"
      >
        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}

const emptyForm: FormState = { name: '', duration_minutes: 30, price: 0, category: '' };

export default function AdminServicesPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['services', bid],
    queryFn: () => api.get(`/businesses/${bid}/services`).then(r => r.data),
    enabled: !!bid,
  });

  const createService = useMutation({
    mutationFn: () => api.post(`/businesses/${bid}/services`, {
      ...form,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
      category: form.category || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', bid] });
      setAddOpen(false);
      setForm(emptyForm);
    },
  });

  const updateService = useMutation({
    mutationFn: (id: string) => api.patch(`/businesses/${bid}/services/${id}`, {
      ...form,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
      category: form.category || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', bid] });
      setEditService(null);
    },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${bid}/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', bid] }),
  });

  const openEdit = (s: Service) => {
    setEditService(s);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: s.price, category: s.category ?? '' });
  };

  const serviceList: Service[] = data?.data ?? [];

  const existingCategories = Array.from(
    new Set(serviceList.map(s => s.category).filter(Boolean) as string[])
  ).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hizmetler</h1>
        <button onClick={() => { setAddOpen(true); setForm(emptyForm); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Hizmet Ekle
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : serviceList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm mb-3">Henüz hizmet eklenmemiş.</p>
          <button onClick={() => setAddOpen(true)} className="text-indigo-600 text-sm hover:underline">Hizmet ekle →</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {serviceList.map(s => (
              <li key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.duration_minutes} dk · {Number(s.price).toLocaleString('tr-TR')} ₺
                    {s.category ? ` · ${s.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 border border-indigo-200 rounded-lg"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => { if (confirm('Hizmeti silmek istediğinize emin misiniz?')) deleteService.mutate(s.id); }}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {addOpen && (
        <Modal title="Hizmet Ekle" onClose={() => setAddOpen(false)}>
          <ServiceForm
            form={form}
            setForm={setForm}
            existingCategories={existingCategories}
            onSubmit={() => createService.mutate()}
            isPending={createService.isPending}
          />
        </Modal>
      )}

      {editService && (
        <Modal title="Hizmet Düzenle" onClose={() => setEditService(null)}>
          <ServiceForm
            form={form}
            setForm={setForm}
            existingCategories={existingCategories}
            onSubmit={() => updateService.mutate(editService.id)}
            isPending={updateService.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
