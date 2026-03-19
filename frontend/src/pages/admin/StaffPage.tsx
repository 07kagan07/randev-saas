import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Clock, Calendar, Ban } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import DatePicker from '../../components/shared/DatePicker';
import api from '../../services/api';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

type BlockType = 'hours' | 'fullday' | 'multiday';

interface Staff {
  id: string; full_name: string | null; phone: string;
  is_active: boolean; avatar_url: string | null;
}
interface WorkingHour {
  day_of_week: number; is_open: boolean; start_time: string | null; end_time: string | null;
}
interface BlockForm {
  blockType: BlockType; date: string; endDate: string; startTime: string; endTime: string; reason: string;
}

const emptyBlockForm = (): BlockForm => ({
  blockType: 'hours', date: '', endDate: '', startTime: '09:00', endTime: '10:00', reason: '',
});

const BLOCK_TYPES: { key: BlockType; label: string; desc: string }[] = [
  { key: 'hours',    label: 'Belirli Saatler', desc: 'Kısmi gün' },
  { key: 'fullday',  label: 'Tam Gün',         desc: 'Tek gün' },
  { key: 'multiday', label: 'Tatil / İzin',    desc: 'Çok günlü' },
];

function formatBlockLabel(b: any) {
  const start = new Date(b.start_at);
  const end   = new Date(b.end_at);
  const fmt   = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const time  = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = start.toDateString() === end.toDateString();
  const fullDay = time(start) === '00:00' && (time(end) === '23:59' || time(end) === '00:00');
  if (sameDay && fullDay) return { date: fmt(start), sub: 'Tüm gün',              type: 'fullday'  as BlockType };
  if (sameDay)            return { date: fmt(start), sub: `${time(start)} – ${time(end)}`, type: 'hours' as BlockType };
  return                         { date: `${fmt(start)} – ${fmt(end)}`, sub: 'Tatil / İzin', type: 'multiday' as BlockType };
}

const TYPE_BADGE: Record<BlockType, string> = {
  hours:    'bg-orange-50 text-orange-600',
  fullday:  'bg-red-50 text-red-500',
  multiday: 'bg-purple-50 text-purple-600',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900 truncate pr-4">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl shrink-0">×</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function AdminStaffPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [hoursStaff, setHoursStaff] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'blocks'>('schedule');
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [hours, setHours] = useState<WorkingHour[]>(
    Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, is_open: i < 5, start_time: '09:00', end_time: '18:00' }))
  );
  const [blockForm, setBlockForm] = useState<BlockForm>(emptyBlockForm());
  const [blockOpen, setBlockOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['staff', bid],
    queryFn: () => api.get(`/businesses/${bid}/staff`).then(r => r.data),
    enabled: !!bid,
  });

  useQuery({
    queryKey: ['admin-working-hours', hoursStaff?.id],
    queryFn: () => api.get(`/staff/${hoursStaff!.id}/working-hours`).then(r => r.data),
    enabled: !!hoursStaff,
    onSuccess: (d: any) => {
      if (d.data?.length) {
        const sorted = [...d.data].sort((a: WorkingHour, b: WorkingHour) => a.day_of_week - b.day_of_week);
        setHours(sorted);
      }
    },
  } as any);

  const { data: blocksData } = useQuery({
    queryKey: ['admin-blocked-periods', hoursStaff?.id],
    queryFn: () => api.get(`/staff/${hoursStaff!.id}/blocked-periods`).then(r => r.data),
    enabled: !!hoursStaff,
  });

  const createStaff = useMutation({
    mutationFn: () => api.post(`/businesses/${bid}/staff`, { ...form, phone: `+90${form.phone.replace(/\D/g, '')}` }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', bid] }); setAddOpen(false); setForm({ full_name: '', phone: '' }); },
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${bid}/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', bid] }),
  });

  const saveHours = useMutation({
    mutationFn: () => {
      const schedule = Object.fromEntries(
        hours.map(h => [h.day_of_week, { is_open: h.is_open, start_time: h.start_time, end_time: h.end_time }])
      );
      return api.patch(`/staff/${hoursStaff!.id}/working-hours`, { schedule });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-working-hours', hoursStaff?.id] }); },
  });

  const addBlock = useMutation({
    mutationFn: () => {
      const { blockType, date, endDate, startTime, endTime } = blockForm;
      const start_at = new Date(
        blockType === 'hours' ? `${date}T${startTime}:00` : `${date}T00:00:00`
      ).toISOString();
      const end_at = new Date(
        blockType === 'hours'    ? `${date}T${endTime}:00` :
        blockType === 'multiday' ? `${endDate}T23:59:59`   : `${date}T23:59:59`
      ).toISOString();
      return api.post(`/staff/${hoursStaff!.id}/blocked-periods`, {
        start_at, end_at, reason: blockForm.reason || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blocked-periods', hoursStaff?.id] });
      setBlockForm(emptyBlockForm());
      setBlockOpen(false);
    },
  });

  const removeBlock = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${hoursStaff!.id}/blocked-periods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-blocked-periods', hoursStaff?.id] }),
  });

  const staffList: Staff[] = data?.data ?? [];
  const blocks: any[] = (blocksData?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  const setBlock = (patch: Partial<BlockForm>) => setBlockForm(f => ({ ...f, ...patch }));
  const today = new Date().toISOString().slice(0, 10);
  const canSave = blockForm.date && (
    blockForm.blockType === 'fullday'  ? true :
    blockForm.blockType === 'multiday' ? (!!blockForm.endDate && blockForm.endDate >= blockForm.date) :
    (blockForm.startTime < blockForm.endTime)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personel</h1>
        <button onClick={() => setAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Personel Ekle
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm mb-3">Henüz personel eklenmemiş.</p>
          <button onClick={() => setAddOpen(true)} className="text-indigo-600 text-sm hover:underline">Personel ekle →</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {staffList.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {(s.full_name || s.phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{s.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  <button
                    onClick={() => {
                      setHours(Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, is_open: i < 5, start_time: '09:00', end_time: '18:00' })));
                      setBlockForm(emptyBlockForm());
                      setBlockOpen(false);
                      setActiveTab('schedule');
                      setHoursStaff(s);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 border border-indigo-200 rounded-lg"
                  >
                    Saatler
                  </button>
                  <button
                    onClick={() => { if (confirm('Personeli silmek istediğinize emin misiniz?')) deleteStaff.mutate(s.id); }}
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

      {/* Personel Ekle Modal */}
      {addOpen && (
        <Modal title="Personel Ekle" onClose={() => setAddOpen(false)}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">+90</span>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  placeholder="5xx xxx xxxx"
                />
              </div>
            </div>
            <button
              onClick={() => createStaff.mutate()}
              disabled={createStaff.isPending || !form.phone || !form.full_name}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-lg"
            >
              {createStaff.isPending ? 'Ekleniyor...' : 'Personel Ekle'}
            </button>
            {createStaff.isError && <p className="text-red-600 text-xs">{(createStaff.error as any)?.response?.data?.message}</p>}
          </div>
        </Modal>
      )}

      {/* Çalışma Saatleri & Blok Dönemler Modal */}
      {hoursStaff && (
        <Modal title={`${hoursStaff.full_name || hoursStaff.phone}`} onClose={() => setHoursStaff(null)}>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6 gap-1 shrink-0">
            {[
              { key: 'schedule', label: 'Haftalık Program' },
              { key: 'blocks',   label: 'Müsait Olmadığı Zamanlar' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Haftalık Program */}
          {activeTab === 'schedule' && (
            <div>
              <div className="divide-y divide-gray-100">
                {hours.map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-6 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={h.is_open}
                          onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, is_open: e.target.checked } : x))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                      <span className="text-sm font-medium text-gray-700 truncate">{DAYS[h.day_of_week]}</span>
                    </div>
                    {h.is_open ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="time"
                          value={h.start_time ?? '09:00'}
                          onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, start_time: e.target.value } : x))}
                          className="w-[76px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                        <span className="text-gray-300 text-xs">–</span>
                        <input
                          type="time"
                          value={h.end_time ?? '18:00'}
                          onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, end_time: e.target.value } : x))}
                          className="w-[76px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Kapalı</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => saveHours.mutate()}
                  disabled={saveHours.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-xl"
                >
                  {saveHours.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Müsait Olmadığı Zamanlar */}
          {activeTab === 'blocks' && (
            <div>
              {/* Ekle butonu / Form */}
              {!blockOpen ? (
                <div className="px-6 py-3 border-b border-gray-100">
                  <button
                    onClick={() => setBlockOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Blok Zaman Ekle
                  </button>
                </div>
              ) : (
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-50 space-y-4">
                  {/* Tip seçici */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {BLOCK_TYPES.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setBlock({ blockType: t.key })}
                        className={`py-2.5 px-2 rounded-xl text-center transition-all border ${
                          blockForm.blockType === t.key
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className={`text-[10px] mt-0.5 ${blockForm.blockType === t.key ? 'text-indigo-200' : 'text-gray-400'}`}>{t.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Tarih(ler) */}
                  {blockForm.blockType === 'multiday' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Başlangıç</p>
                        <DatePicker value={blockForm.date} min={today} onChange={v => setBlock({ date: v })} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Bitiş</p>
                        <DatePicker value={blockForm.endDate} min={blockForm.date || today} onChange={v => setBlock({ endDate: v })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Tarih</p>
                      <DatePicker value={blockForm.date} min={today} onChange={v => setBlock({ date: v })} />
                    </div>
                  )}

                  {/* Saat aralığı */}
                  {blockForm.blockType === 'hours' && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Kapalı olacak saat aralığı</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={blockForm.startTime}
                          onChange={e => setBlock({ startTime: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                        <span className="text-gray-300 shrink-0">–</span>
                        <input
                          type="time"
                          value={blockForm.endTime}
                          onChange={e => setBlock({ endTime: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                      {blockForm.startTime && blockForm.endTime && blockForm.startTime >= blockForm.endTime && (
                        <p className="text-red-500 text-xs mt-1.5">Bitiş saati başlangıçtan sonra olmalı.</p>
                      )}
                    </div>
                  )}

                  {/* Açıklama */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Açıklama <span className="text-gray-400 font-normal">(opsiyonel)</span></p>
                    <input
                      value={blockForm.reason}
                      onChange={e => setBlock({ reason: e.target.value })}
                      placeholder="örn. İzin, Toplantı"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => addBlock.mutate()}
                      disabled={addBlock.isPending || !canSave}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium py-2.5 rounded-xl"
                    >
                      {addBlock.isPending ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                    <button
                      onClick={() => { setBlockOpen(false); setBlockForm(emptyBlockForm()); }}
                      className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-white"
                    >
                      İptal
                    </button>
                  </div>
                  {addBlock.isError && (
                    <p className="text-red-600 text-xs">{(addBlock.error as any)?.response?.data?.message ?? 'Hata oluştu.'}</p>
                  )}
                </div>
              )}

              {/* Liste */}
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                  <Ban className="w-8 h-8 text-gray-200" />
                  <p className="text-sm">Blok zaman eklenmemiş.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {blocks.map((b: any) => {
                    const { date, sub, type } = formatBlockLabel(b);
                    return (
                      <li key={b.id} className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_BADGE[type]}`}>
                            {type === 'hours' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{date}</p>
                            <p className="text-xs text-gray-400">{sub}{b.reason ? ` · ${b.reason}` : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeBlock.mutate(b.id)}
                          disabled={removeBlock.isPending}
                          className="shrink-0 ml-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
