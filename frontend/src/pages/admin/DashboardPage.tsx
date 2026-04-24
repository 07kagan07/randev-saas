import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { fmtTime } from '../../utils/locale';
import api from '../../services/api';

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-orange-100 text-orange-700',
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const bid = user?.business_id;

  const today = new Date().toISOString().slice(0, 10);

  const { data: appts, isLoading: apptLoading } = useQuery({
    queryKey: ['admin-today-appts', bid, today],
    queryFn: () => api.get(`/appointments`, {
      params: { businessId: bid, from: today, to: today, per_page: 20 },
    }).then(r => r.data),
    enabled: !!bid,
  });

  const { data: usage } = useQuery({
    queryKey: ['plan-usage', bid],
    queryFn: () => api.get(`/businesses/${bid}/plan-usage`).then(r => r.data),
    enabled: !!bid,
  });

  const appointments = appts?.data ?? [];
  const u = usage?.data;
  const isUnlimited = (limit: any) => limit === 'unlimited' || limit === Infinity || limit === -1;

  return (
    <div>
      {user?.onboarding_completed === false && (
        <button
          onClick={() => navigate('/admin/onboarding')}
          className="w-full flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-5 py-4 mb-6 text-left transition-colors"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t('dashboard.completeSetup')}</p>
            <p className="text-indigo-200 text-xs mt-0.5">{t('dashboard.completeSetupSubtitle')}</p>
          </div>
          <span className="shrink-0 text-indigo-200 text-sm font-medium">{t('dashboard.goToSetup')}</span>
        </button>
      )}

      {u && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: t('dashboard.monthlyAppointments'), used: u.monthly_appointments?.used ?? 0, limit: u.monthly_appointments?.limit, warn: u.warn },
            { label: t('dashboard.staffCount'),          used: u.staff?.used ?? 0,                limit: u.staff?.limit,                warn: false },
            { label: t('dashboard.serviceCount'),        used: u.services?.used ?? 0,             limit: u.services?.limit,             warn: false },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className={`text-xs font-semibold ${item.warn ? 'text-orange-600' : 'text-gray-500'}`}>
                  {item.used} / {isUnlimited(item.limit) ? '∞' : item.limit}
                </span>
              </div>
              {!isUnlimited(item.limit) && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.warn ? 'bg-orange-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, (item.used / Number(item.limit)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('dashboard.todayAppointments')}</h2>
          <Link to="/admin/appointments" className="text-sm text-indigo-600 hover:text-indigo-800">
            {t('dashboard.viewAll')}
          </Link>
        </div>

        {apptLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">{t('dashboard.noAppointments')}</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {appointments.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.customer_name}</p>
                  <p className="text-xs text-gray-400">{a.customer_phone} · {a.service?.name} · {a.staff?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{fmtTime(a.start_at)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
                    {t(`appointments.status.${a.status}`, { defaultValue: a.status })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
