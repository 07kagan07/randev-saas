import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown, Check, X, UserX, AlertTriangle } from 'lucide-react';

/** Randevu "geçmiş mi?" — saati geçmiş veya terminal statüde */
export function isArchived(a: any): boolean {
  const terminal = ['completed', 'cancelled', 'rejected', 'no_show'];
  if (terminal.includes(a.status)) return true;
  return new Date(a.end_at) < new Date();
}

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

interface Props {
  appt: any;
  /** Which action buttons to show. Defaults to staff actions. */
  actions?: 'staff' | 'admin';
  onAction: (id: string, act: string) => void;
  isPending?: boolean;
}

function CancelModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">Randevuyu İptal Et</h3>
          <p className="text-sm text-gray-500 mb-6">Bu randevuyu iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Vazgeç
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-medium text-white transition-colors">
              İptal Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApptCard({ appt: a, actions = 'staff', onAction, isPending }: Props) {
  const [open, setOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const startTime = new Date(a.start_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(a.end_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const showApproveActions = a.status === 'pending' && actions === 'admin';
  const showStaffActions = a.status === 'approved';
  const showActions = showApproveActions || showStaffActions;

  return (
    <>
    {cancelConfirm && (
      <CancelModal
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => { setCancelConfirm(false); onAction(a.id, 'cancel'); }}
      />
    )}
    <div ref={ref} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Saat */}
        <div className="text-left w-12 shrink-0">
          <p className="text-base font-bold text-indigo-600 leading-none">{startTime}</p>
          <p className="text-xs text-gray-400 mt-0.5">{endTime}</p>
        </div>

        {/* Müşteri */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-none">{a.customer_name}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {a.customer_phone}
          </p>
        </div>

        {/* Durum + toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(a.status === 'completed' || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'no_show') && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
              {STATUS_LABEL[a.status]}
            </span>
          )}
          <button onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aksiyon butonları — her zaman görünür (aktif randevular için) */}
      {showActions && (
        <div className="flex gap-2 px-4 pb-3">
          {showApproveActions && (
            <>
              <button onClick={() => onAction(a.id, 'approve')} disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                <Check className="w-4 h-4" />
                Onayla
              </button>
              <button onClick={() => onAction(a.id, 'reject')} disabled={isPending}
                className="w-12 flex items-center justify-center py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {showStaffActions && (
            <>
              <button onClick={() => onAction(a.id, 'complete')} disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                <Check className="w-4 h-4" />
                Tamamlandı
              </button>
              <button onClick={() => onAction(a.id, 'no-show')} disabled={isPending}
                className="w-12 flex items-center justify-center py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-500 rounded-xl transition-colors disabled:opacity-50">
                <UserX className="w-4 h-4" />
              </button>
              <button onClick={() => setCancelConfirm(true)} disabled={isPending}
                className="w-12 flex items-center justify-center py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Genişletilmiş detay — animasyonlu */}
      <div
        style={{
          maxHeight: open ? (detailRef.current?.scrollHeight ?? 500) + 'px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.28s ease',
        }}
      >
        <div ref={detailRef} className="px-4 pb-4 pt-1 border-t border-gray-100 grid grid-cols-2 gap-3">
          {/* Müşteri İletişim */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Müşteri İletişim</p>
            <p className="text-sm text-gray-800 mb-2">{a.customer_phone}</p>
            <a href={`tel:${a.customer_phone}`}
              className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Phone className="w-3.5 h-3.5" />
              Ara
            </a>
          </div>

          {/* Hizmet Detayları */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Hizmet Detayları</p>
            <p className="text-sm font-medium text-gray-800">{a.service?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{a.service?.duration_minutes} dk</p>
            {a.service?.price != null && (
              <p className="text-sm font-semibold text-gray-700 mt-1">
                {Number(a.service.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
