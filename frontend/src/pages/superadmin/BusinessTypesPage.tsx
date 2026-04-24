import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, GripVertical, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';

interface BookingFormField {
  key: string;
  label: string;
  type: 'text' | 'tel' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface TemplateService {
  name: string;
  duration_minutes: number;
  price: number;
  category?: string;
}

interface BusinessType {
  id: string;
  name: string;
  icon: string | null;
  template_services: TemplateService[];
  booking_form_fields: BookingFormField[];
  is_active: boolean;
  sort_order: number;
}

const emptyField = (): BookingFormField => ({ key: '', label: '', type: 'text', required: false, placeholder: '' });
const emptyService = (): TemplateService => ({ name: '', duration_minutes: 30, price: 0, category: '' });
const emptyType = (): Partial<BusinessType> => ({ name: '', icon: '', template_services: [], booking_form_fields: [], is_active: true, sort_order: 0 });

export default function BusinessTypesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<BusinessType | null>(null);
  const [form, setForm] = useState<Partial<BusinessType>>(emptyType());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const FIELD_TYPES = [
    { value: 'text', label: t('superadmin.businessTypes.fieldTypes.text') },
    { value: 'tel', label: t('superadmin.businessTypes.fieldTypes.phone') },
    { value: 'number', label: t('superadmin.businessTypes.fieldTypes.number') },
    { value: 'select', label: t('superadmin.businessTypes.fieldTypes.select') },
    { value: 'textarea', label: t('superadmin.businessTypes.fieldTypes.textarea') },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['business-types'],
    queryFn: () => api.get('/business-types').then(r => r.data?.data ?? r.data),
  });

  const [localTypes, setLocalTypes] = useState<BusinessType[]>([]);
  const types: BusinessType[] = localTypes.length > 0 ? localTypes : (Array.isArray(data) ? data : []);

  React.useEffect(() => {
    if (Array.isArray(data)) setLocalTypes(data);
  }, [data]);

  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const reorderMut = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      Promise.all(items.map(({ id, sort_order }) => api.patch(`/business-types/${id}`, { sort_order }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-types'] }),
  });

  const handleDragStart = (idx: number) => { dragIndex.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIndex.current = idx;
  };
  const handleDrop = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    const reordered = [...types];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updated = reordered.map((bt, i) => ({ ...bt, sort_order: i + 1 }));
    setLocalTypes(updated);
    reorderMut.mutate(updated.map(bt => ({ id: bt.id, sort_order: bt.sort_order })));

    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const createMut = useMutation({
    mutationFn: (body: Partial<BusinessType>) => api.post('/business-types', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business-types'] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<BusinessType> }) => api.patch(`/business-types/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business-types'] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/business-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-types'] }),
  });

  const openCreate = () => { setForm(emptyType()); setEditing(null); setModal('create'); };
  const openEdit = (bt: BusinessType) => { setEditing(bt); setForm({ ...bt }); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const save = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...rest } = form as any;
    if (modal === 'edit' && editing) {
      updateMut.mutate({ id: editing.id, body: rest });
    } else {
      createMut.mutate(rest);
    }
  };

  const setField = (idx: number, field: Partial<BookingFormField>) => {
    const fields = [...(form.booking_form_fields ?? [])];
    fields[idx] = { ...fields[idx], ...field };
    setForm(f => ({ ...f, booking_form_fields: fields }));
  };

  const removeField = (idx: number) => {
    setForm(f => ({ ...f, booking_form_fields: f.booking_form_fields?.filter((_, i) => i !== idx) }));
  };

  const setService = (idx: number, svc: Partial<TemplateService>) => {
    const svcs = [...(form.template_services ?? [])];
    svcs[idx] = { ...svcs[idx], ...svc };
    setForm(f => ({ ...f, template_services: svcs }));
  };

  const removeService = (idx: number) => {
    setForm(f => ({ ...f, template_services: f.template_services?.filter((_, i) => i !== idx) }));
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> {t('superadmin.businessTypes.newType')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : (
        <div className="space-y-2">
          {types.map((bt, idx) => (
            <div
              key={bt.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              className="bg-white rounded-xl border border-gray-200 cursor-default"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab active:cursor-grabbing" />
                <span className="text-xl">{bt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{bt.name}</p>
                  <p className="text-xs text-gray-400">
                    {bt.template_services.length} {t('superadmin.businessTypes.serviceCountLabel')} · {bt.booking_form_fields.length} {t('superadmin.businessTypes.fieldCountLabel')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${bt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {bt.is_active ? t('common.active') : t('common.passive')}
                </span>
                <button onClick={() => setExpandedId(expandedId === bt.id ? null : bt.id)} className="p-1 text-gray-400 hover:text-gray-600">
                  {expandedId === bt.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(bt)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(t('superadmin.businessTypes.deleteConfirm'))) deleteMut.mutate(bt.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>

              {expandedId === bt.id && (
                <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('superadmin.businessTypes.templateServices')}</p>
                    {bt.template_services.length === 0 ? <p className="text-xs text-gray-400">{t('superadmin.businessTypes.noServices')}</p> : (
                      <div className="space-y-1">
                        {bt.template_services.map((s, i) => (
                          <div key={i} className="text-xs text-gray-700 flex justify-between">
                            <span>{s.name} {s.category && <span className="text-gray-400">({s.category})</span>}</span>
                            <span>{s.duration_minutes}dk · {s.price}₺</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('superadmin.businessTypes.formFields')}</p>
                    {bt.booking_form_fields.length === 0 ? <p className="text-xs text-gray-400">{t('superadmin.businessTypes.standardForm')}</p> : (
                      <div className="space-y-1">
                        {bt.booking_form_fields.map((f, i) => (
                          <div key={i} className="text-xs text-gray-700 flex gap-2">
                            <span className="font-medium">{f.label}</span>
                            <span className="text-gray-400">{f.type}</span>
                            {f.required && <span className="text-red-400">*{t('superadmin.businessTypes.requiredFieldCheck')}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {modal === 'edit' ? t('superadmin.businessTypes.editTitle') : t('superadmin.businessTypes.createTitle')}
              </h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('superadmin.businessTypes.nameLabel')}</label>
                  <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={t('superadmin.businessTypes.namePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('superadmin.businessTypes.iconLabel')}</label>
                  <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="💈" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="is_active" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                  <label htmlFor="is_active" className="text-sm text-gray-700">{t('common.active')}</label>
                </div>
              </div>

              {/* Template services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">{t('superadmin.businessTypes.templateServices')}</h3>
                  <button onClick={() => setForm(f => ({ ...f, template_services: [...(f.template_services ?? []), emptyService()] }))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {t('common.add')}
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.template_services ?? []).map((svc, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={svc.name} onChange={e => setService(i, { name: e.target.value })}
                        placeholder={t('superadmin.businessTypes.serviceNamePlaceholder')}
                        className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <input value={svc.category ?? ''} onChange={e => setService(i, { category: e.target.value })}
                        placeholder={t('superadmin.businessTypes.serviceCategoryPlaceholder')}
                        className="col-span-3 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <input type="number" value={svc.duration_minutes} onChange={e => setService(i, { duration_minutes: Number(e.target.value) })}
                        placeholder={t('superadmin.businessTypes.serviceDurationPlaceholder')}
                        className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <input type="number" value={svc.price} onChange={e => setService(i, { price: Number(e.target.value) })}
                        placeholder="₺" className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <button onClick={() => removeService(i)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra form fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">{t('superadmin.businessTypes.formFields')}</h3>
                    <p className="text-xs text-gray-400">{t('superadmin.businessTypes.formFieldsDesc')}</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, booking_form_fields: [...(f.booking_form_fields ?? []), emptyField()] }))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0">
                    <Plus className="w-3 h-3" /> {t('common.add')}
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.booking_form_fields ?? []).map((ff, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('superadmin.businessTypes.fieldKeyLabel')}</label>
                          <input value={ff.key} onChange={e => setField(i, { key: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                            placeholder="plate" className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('superadmin.businessTypes.fieldLabelCol')}</label>
                          <input value={ff.label} onChange={e => setField(i, { label: e.target.value })}
                            placeholder={t('superadmin.businessTypes.fieldLabelPlaceholder')}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('superadmin.businessTypes.fieldTypeCol')}</label>
                          <select value={ff.type} onChange={e => setField(i, { type: e.target.value as BookingFormField['type'] })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Placeholder</label>
                          <input value={ff.placeholder ?? ''} onChange={e => setField(i, { placeholder: e.target.value })}
                            placeholder="34 ABC 123" className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>
                      {ff.type === 'select' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('superadmin.businessTypes.fieldOptions')}</label>
                          <input value={(ff.options ?? []).join(',')} onChange={e => setField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            placeholder={t('superadmin.businessTypes.fieldOptionPlaceholder')}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={ff.required} onChange={e => setField(i, { required: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-600" />
                          {t('superadmin.businessTypes.requiredFieldCheck')}
                        </label>
                        <button onClick={() => removeField(i)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                          <X className="w-3 h-3" /> {t('superadmin.businessTypes.remove')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
              <button onClick={save} disabled={!form.name || isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2 rounded-lg">
                {isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
