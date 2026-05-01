import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NotificationItem } from '../../hooks/useAppointmentNotifications';

function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  notifications: NotificationItem[];
  unreadCount: number;
  onOpen: () => void;
  appointmentsPath: string;
}

export default function NotificationBell({ notifications, unreadCount, onOpen, appointmentsPath }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) onOpen();
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' }) +
        ' ' +
        d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label={t('notifBell.title')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{t('notifBell.title')}</span>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-indigo-600">
                {unreadCount} {t('notifBell.new')}
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {t('notifBell.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {notifications.map((n) => {
                const dateStr = toLocalDateStr(n.startAt);
                const href = `${appointmentsPath}?date=${dateStr}&highlight=${n.id}`;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(href);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-50 ${
                        !n.read ? 'bg-indigo-50/50' : 'bg-white'
                      }`}
                    >
                      <div
                        className={`mt-2 shrink-0 w-2 h-2 rounded-full ${
                          !n.read ? 'bg-indigo-500' : 'bg-gray-200'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{n.customerName}</p>
                        <p className="text-xs text-gray-500 truncate">{n.serviceName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-gray-400">{formatTime(n.startAt)}</span>
                          {n.status === 'pending' && (
                            <span className="inline-flex items-center text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              {t('notifBell.pendingApproval')}
                            </span>
                          )}
                          {n.status === 'approved' && (
                            <span className="inline-flex items-center text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              {t('notifBell.approved')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <Link
              to={appointmentsPath}
              onClick={() => setOpen(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              {t('notifBell.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
