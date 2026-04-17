import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, ChevronUp, ChevronDown, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

interface StaffMember {
  id: string;
  full_name: string | null;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
  staff_services?: { staff: StaffMember }[];
}

type FormState = {
  name: string;
  duration_minutes: number;
  price: number;
  category: string;
  staff_ids: string[];
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Hizmet Formu ─────────────────────────────────────────────────────────────

function ServiceForm({ form, setForm, existingCategories, staffList, onSubmit, isPending }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  existingCategories: string[];
  staffList: StaffMember[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  const filteredCats = form.category.trim()
    ? existingCategories.filter(c => c.toLowerCase().includes(form.category.toLowerCase()))
    : existingCategories;

  const toggleStaff = (id: string) => {
    setForm(f => ({
      ...f,
      staff_ids: f.staff_ids.includes(id)
        ? f.staff_ids.filter(s => s !== id)
        : [...f.staff_ids, id],
    }));
  };

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
          <input type="number" min={5} value={form.duration_minutes}
            onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
          <input type="number" min={0} step={0.01} value={form.price}
            onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
        <input list="cat-suggestions" value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={existingCategories.length ? 'Seçin veya yazın...' : 'Saç, Tırnak...'} />
        <datalist id="cat-suggestions">
          {existingCategories.map(c => <option key={c} value={c} />)}
        </datalist>
        {filteredCats.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredCats.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 transition-colors ${
                  form.category === c
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                }`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Personel seçimi */}
      {staffList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bu hizmeti yapabilecek personel
          </label>
          <div className="space-y-2">
            {staffList.map(s => {
              const selected = form.staff_ids.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStaff(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                    selected
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {(s.full_name || s.phone).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800 flex-1">{s.full_name || s.phone}</span>
                  {selected && <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          {form.staff_ids.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">Seçim yapılmazsa tüm personel bu hizmeti yapabilir.</p>
          )}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isPending || !form.name.trim() || !form.category.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-lg"
      >
        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}

// ─── Sürüklenebilir Kategori Kartı ───────────────────────────────────────────

function DraggableCategoryCard({ cat, count, dragOver, children, onReorder, onMoveUp, onMoveDown, isFirst, isLast }: {
  cat: string;
  count: number;
  dragOver: boolean;
  children: React.ReactNode;
  onReorder: (from: string, to: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const dragSrc = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const touchState = useRef<{
    startY: number; currentY: number; active: boolean;
    clone: HTMLElement | null; origRect: DOMRect | null;
  }>({ startY: 0, currentY: 0, active: false, clone: null, origRect: null });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-grip]')) return;
    const touch = e.touches[0];
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    touchState.current = { startY: touch.clientY, currentY: touch.clientY, active: true, origRect: rect, clone: null };
    const clone = card.cloneNode(true) as HTMLElement;
    clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:0.85;z-index:9999;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.15);border-radius:12px;`;
    document.body.appendChild(clone);
    touchState.current.clone = clone;
    card.style.opacity = '0.3';
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current.active || !touchState.current.clone) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - touchState.current.startY;
    touchState.current.clone.style.top = `${touchState.current.origRect!.top + dy}px`;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current.active) return;
    if (touchState.current.clone) { document.body.removeChild(touchState.current.clone); touchState.current.clone = null; }
    if (cardRef.current) cardRef.current.style.opacity = '';
    touchState.current.active = false;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCard = el?.closest('[data-cat-card]') as HTMLElement | null;
    const targetCat = targetCard?.dataset.catCard;
    if (targetCat && targetCat !== cat) onReorder(cat, targetCat);
  }, [cat, onReorder]);

  return (
    <div
      ref={cardRef} data-cat-card={cat}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      draggable
      onDragStart={() => { dragSrc.current = cat; }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (dragSrc.current && dragSrc.current !== cat) onReorder(dragSrc.current, cat); }}
      className={`rounded-xl border bg-white transition-all ${dragOver ? 'border-indigo-400 shadow-md ring-2 ring-indigo-200' : 'border-gray-200'}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 select-none">
        <div data-grip className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        </div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{cat}</span>
        <span className="text-xs text-gray-400 ml-auto">{count} hizmet</span>
        <div className="flex gap-0.5 ml-2">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded-lg disabled:opacity-20 hover:bg-gray-100 transition-colors">
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded-lg disabled:opacity-20 hover:bg-gray-100 transition-colors">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const emptyForm = (staffList: StaffMember[]): FormState => ({
  name: '', duration_minutes: 30, price: 0, category: '',
  staff_ids: staffList.map(s => s.id), // varsayılan: tüm personel seçili
});

export default function AdminServicesPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', duration_minutes: 30, price: 0, category: '', staff_ids: [] });
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', bid],
    queryFn: () => api.get(`/businesses/${bid}/services`).then(r => r.data),
    enabled: !!bid,
  });

  const { data: bizData } = useQuery({
    queryKey: ['business', bid],
    queryFn: () => api.get(`/businesses/${bid}`).then(r => r.data),
    enabled: !!bid,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff', bid],
    queryFn: () => api.get(`/businesses/${bid}/staff`).then(r => r.data),
    enabled: !!bid,
  });

  const serviceList: Service[] = servicesData?.data ?? [];
  const categoryOrder: string[] = bizData?.data?.category_order ?? [];
  const staffList: StaffMember[] = (staffData?.data ?? []).filter((s: any) => s.is_active);

  const allCategories = Array.from(new Set(serviceList.map(s => s.category).filter(Boolean) as string[]));
  const orderedCategories = [
    ...categoryOrder.filter(c => allCategories.includes(c)),
    ...allCategories.filter(c => !categoryOrder.includes(c)).sort(),
  ];
  const uncategorized = serviceList.filter(s => !s.category);
  const grouped: Record<string, Service[]> = {};
  for (const cat of orderedCategories) grouped[cat] = serviceList.filter(s => s.category === cat);

  const saveOrder = useMutation({
    mutationFn: (order: string[]) => api.patch(`/businesses/${bid}`, { category_order: order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business', bid] }),
  });

  const handleReorder = useCallback((from: string, to: string) => {
    const newOrder = [...orderedCategories];
    const fi = newOrder.indexOf(from), ti = newOrder.indexOf(to);
    if (fi === -1 || ti === -1) return;
    newOrder.splice(fi, 1); newOrder.splice(ti, 0, from);
    saveOrder.mutate(newOrder); setDragOverCat(null);
  }, [orderedCategories, saveOrder]);

  const createService = useMutation({
    mutationFn: () => api.post(`/businesses/${bid}/services`, {
      name: form.name, duration_minutes: Number(form.duration_minutes),
      price: Number(form.price), category: form.category || null,
      staff_ids: form.staff_ids.length > 0 ? form.staff_ids : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services', bid] }); setAddOpen(false); },
  });

  const updateService = useMutation({
    mutationFn: (id: string) => api.patch(`/businesses/${bid}/services/${id}`, {
      name: form.name, duration_minutes: Number(form.duration_minutes),
      price: Number(form.price), category: form.category || null,
      staff_ids: form.staff_ids,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services', bid] }); setEditService(null); },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${bid}/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', bid] }),
  });

  const openAdd = () => {
    setForm(emptyForm(staffList));
    setAddOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditService(s);
    setForm({
      name: s.name,
      duration_minutes: s.duration_minutes,
      price: s.price,
      category: s.category ?? '',
      staff_ids: s.staff_services?.map(ss => ss.staff.id) ?? [],
    });
  };

  const renderServiceRow = (s: Service) => {
    const assignedStaff = s.staff_services?.map(ss => ss.staff) ?? [];
    return (
      <li key={s.id} className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">{s.name}</p>
            <p className="text-xs text-gray-400">
              {s.duration_minutes} dk · {Number(s.price).toLocaleString('tr-TR')} ₺
            </p>
            {/* Personel avatarları */}
            {assignedStaff.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {assignedStaff.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    <span className="w-4 h-4 bg-indigo-200 rounded-full inline-flex items-center justify-center text-[10px] font-bold">
                      {(p.full_name || p.phone).charAt(0).toUpperCase()}
                    </span>
                    {p.full_name || p.phone}
                  </span>
                ))}
              </div>
            )}
            {assignedStaff.length === 0 && staffList.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">Tüm personel</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {s.is_active ? 'Aktif' : 'Pasif'}
            </span>
            <button onClick={() => openEdit(s)}
              className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 border border-indigo-200 rounded-lg">
              Düzenle
            </button>
            <button onClick={() => { if (confirm('Hizmeti silmek istediğinize emin misiniz?')) deleteService.mutate(s.id); }}
              className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg">
              Sil
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <button onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Hizmet Ekle
        </button>
      </div>

      {servicesLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : serviceList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm mb-3">Henüz hizmet eklenmemiş.</p>
          <button onClick={openAdd} className="text-indigo-600 text-sm hover:underline">Hizmet ekle →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedCategories.length > 1 && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Başlığı tutup sürükleyerek kategori sırasını değiştirebilirsiniz
            </p>
          )}
          {orderedCategories.map((cat, idx) => (
            <DraggableCategoryCard key={cat} cat={cat} count={grouped[cat].length}
              dragOver={dragOverCat === cat} onReorder={handleReorder}
              isFirst={idx === 0} isLast={idx === orderedCategories.length - 1}
              onMoveUp={() => idx > 0 && handleReorder(cat, orderedCategories[idx - 1])}
              onMoveDown={() => idx < orderedCategories.length - 1 && handleReorder(cat, orderedCategories[idx + 1])}>
              <ul className="divide-y divide-gray-50">{grouped[cat].map(renderServiceRow)}</ul>
            </DraggableCategoryCard>
          ))}
          {uncategorized.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kategorisiz</span>
              </div>
              <ul className="divide-y divide-gray-50">{uncategorized.map(renderServiceRow)}</ul>
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <Modal title="Hizmet Ekle" onClose={() => setAddOpen(false)}>
          <ServiceForm form={form} setForm={setForm} existingCategories={orderedCategories}
            staffList={staffList} onSubmit={() => createService.mutate()} isPending={createService.isPending} />
        </Modal>
      )}
      {editService && (
        <Modal title="Hizmet Düzenle" onClose={() => setEditService(null)}>
          <ServiceForm form={form} setForm={setForm} existingCategories={orderedCategories}
            staffList={staffList} onSubmit={() => updateService.mutate(editService.id)} isPending={updateService.isPending} />
        </Modal>
      )}
    </div>
  );
}
