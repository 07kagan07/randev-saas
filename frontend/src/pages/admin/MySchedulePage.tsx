import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Check, Clock, Calendar, Ban } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import DatePicker from '../../components/shared/DatePicker';
import { userLocale } from '../../utils/locale';
import api from '../../services/api';

type BlockType = 'hours' | 'fullday' | 'multiday';

interface WorkingHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface BlockForm {
  blockType: BlockType; date: string; endDate: string; startTime: string; endTime: string; reason: string;
}

const emptyBlockForm = (): BlockForm => ({
  blockType: 'hours', date: '', endDate: '', startTime: '09:00', endTime: '10:00', reason: '',
});

const defaultHours = (): WorkingHour[] =>
  Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i, is_open: i < 5, start_time: '09:00', end_time: '18:00',
  }));

const TYPE_BADGE: Record<BlockType, string> = {
  hours:    'bg-orange-50 text-orange-600',
  fullday:  'bg-red-50 text-red-500',
  multiday: 'bg-purple-50 text-purple-600',
};

export default function AdminMySchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const staffId = user?.id!;

  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const DAYS = DAY_KEYS.map(k => t(`common.days.${k}`));

  const BLOCK_TYPES: { key: BlockType; label: string; desc: string }[] = [
    { key: 'hours',    label: t('workingHours.blockTypes.specificHours'), desc: t('staff.blockTypePartialDesc') },
    { key: 'fullday',  label: t('workingHours.blockTypes.fullDay'),       desc: t('staff.blockTypeSingleDesc') },
    { key: 'multiday', label: t('workingHours.blockTypes.vacation'),      desc: t('staff.blockTypeMultiDesc') },
  ];

  const formatBlockLabel = (b: any) => {
    const start = new Date(b.start_at);
    const end   = new Date(b.end_at);
    const fmt   = (d: Date) => d.toLocaleDateString(userLocale, { day: 'numeric', month: 'long' });
    const time  = (d: Date) => d.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit' });
    const sameDay = start.toDateString() === end.toDateString();
    const fullDay = time(start) === '00:00' && (time(end) === '23:59' || time(end) === '00:00');
    if (sameDay && fullDay) return { date: fmt(start), sub: t('common.fullDay'),                       type: 'fullday'  as BlockType };
    if (sameDay)            return { date: fmt(start), sub: `${time(start)} – ${time(end)}`,           type: 'hours'    as BlockType };
    return                         { date: `${fmt(start)} – ${fmt(end)}`, sub: t('staff.blockLabel.vacation'), type: 'multiday' as BlockType };
  };

  const [hours,     setHours]     = useState<WorkingHour[]>(defaultHours());
  const [blockForm, setBlockForm] = useState<BlockForm>(emptyBlockForm());
  const [blockOpen, setBlockOpen] = useState(false);
  const [saved,     setSaved]     = useState(false);

  const { isLoading, data: hoursData } = useQuery({
    queryKey: ['admin-my-hours', staffId],
    queryFn: () => api.get(`/staff/${staffId}/working-hours`).then(r => r.data),
    enabled: !!staffId,
  });

  React.useEffect(() => {
    const list = hoursData?.data;
    if (Array.isArray(list) && list.length === 7) {
      setHours([...list].sort((a: WorkingHour, b: WorkingHour) => a.day_of_week - b.day_of_week));
    }
  }, [hoursData]);

  const saveHours = useMutation({
    mutationFn: () => {
      const schedule = Object.fromEntries(
        hours.map(h => [h.day_of_week, { is_open: h.is_open, start_time: h.start_time, end_time: h.end_time }])
      );
      return api.patch(`/staff/${staffId}/working-hours`, { schedule });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-my-hours'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const { data: blocksData } = useQuery({
    queryKey: ['admin-my-blocks', staffId],
    queryFn: () => api.get(`/staff/${staffId}/blocked-periods`).then(r => r.data),
    enabled: !!staffId,
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
      return api.post(`/staff/${staffId}/blocked-periods`, {
        start_at, end_at, reason: blockForm.reason || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-my-blocks'] });
      setBlockForm(emptyBlockForm());
      setBlockOpen(false);
    },
  });

  const removeBlock = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${staffId}/blocked-periods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-my-blocks'] }),
  });

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
  const updateHour = (i: number, patch: Partial<WorkingHour>) =>
    setHours(prev => prev.map((x, j) => j === i ? { ...x, ...patch } : x));

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
  }

  return (
    <div className="max-w-xl">

      {/* ── Weekly Schedule ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900">{t('staff.weeklySchedule')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('workingHours.weeklyProgramDesc')}</p>
        </div>

        <div className="divide-y divide-gray-100">
          {hours.map((h, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={h.is_open}
                    onChange={e => {
                      const open = e.target.checked;
                      updateHour(i, {
                        is_open: open,
                        ...(open && !h.start_time ? { start_time: '09:00', end_time: '18:00' } : {}),
                      });
                    }}
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
                    onChange={e => updateHour(i, { start_time: e.target.value })}
                    className="w-[76px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                  <span className="text-gray-300 text-xs">–</span>
                  <input
                    type="time"
                    value={h.end_time ?? '18:00'}
                    onChange={e => updateHour(i, { end_time: e.target.value })}
                    className="w-[76px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              ) : (
                <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{t('common.closed')}</span>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => saveHours.mutate()}
            disabled={saveHours.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {saved
              ? <><Check className="w-4 h-4" /> {t('common.saved')}</>
              : saveHours.isPending ? t('common.saving') : t('workingHours.save')}
          </button>
        </div>
      </div>

      {/* ── Blocked Periods ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{t('workingHours.blockPeriods')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('workingHours.unavailableDesc')}</p>
          </div>
          {!blockOpen && (
            <button
              onClick={() => setBlockOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> {t('common.add')}
            </button>
          )}
        </div>

        {blockOpen && (
          <div className="px-5 py-4 border-b border-gray-100 bg-slate-50 space-y-4">
            <div className="grid grid-cols-3 gap-1.5">
              {BLOCK_TYPES.map(bt => (
                <button
                  key={bt.key}
                  onClick={() => setBlock({ blockType: bt.key })}
                  className={`py-2.5 px-2 rounded-xl text-center transition-all border ${
                    blockForm.blockType === bt.key
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <p className="text-xs font-semibold">{bt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${blockForm.blockType === bt.key ? 'text-indigo-200' : 'text-gray-400'}`}>{bt.desc}</p>
                </button>
              ))}
            </div>

            {blockForm.blockType === 'multiday' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">{t('appointments.from')}</p>
                  <DatePicker value={blockForm.date} min={today} onChange={v => setBlock({ date: v })} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">{t('appointments.to')}</p>
                  <DatePicker value={blockForm.endDate} min={blockForm.date || today} onChange={v => setBlock({ endDate: v })} />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{t('booking.steps.date')}</p>
                <DatePicker value={blockForm.date} min={today} onChange={v => setBlock({ date: v })} />
              </div>
            )}

            {blockForm.blockType === 'hours' && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{t('staff.closedTimeRange')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={blockForm.startTime}
                    onChange={e => setBlock({ startTime: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                  <span className="text-gray-300 shrink-0 text-lg">–</span>
                  <input
                    type="time"
                    value={blockForm.endTime}
                    onChange={e => setBlock({ endTime: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                {blockForm.startTime && blockForm.endTime && blockForm.startTime >= blockForm.endTime && (
                  <p className="text-red-500 text-xs mt-1.5">{t('staff.endAfterStart')}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                {t('workingHours.reasonLabel')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
              </p>
              <input
                value={blockForm.reason}
                onChange={e => setBlock({ reason: e.target.value })}
                placeholder={t('workingHours.reasonPlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder:text-gray-300"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addBlock.mutate()}
                disabled={addBlock.isPending || !canSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {addBlock.isPending ? t('common.adding') : t('common.add')}
              </button>
              <button
                onClick={() => { setBlockOpen(false); setBlockForm(emptyBlockForm()); }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
            {addBlock.isError && (
              <p className="text-red-600 text-xs">{(addBlock.error as any)?.response?.data?.message ?? t('common.errorOccurred')}</p>
            )}
          </div>
        )}

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
            <Ban className="w-8 h-8 text-gray-200" />
            <p className="text-sm">{t('workingHours.noBlocksYet')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {blocks.map((b: any) => {
              const { date, sub, type } = formatBlockLabel(b);
              return (
                <li key={b.id} className="flex items-center justify-between px-5 py-3.5">
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
    </div>
  );
}
