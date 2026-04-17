import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import ApptCard, { isArchived } from '../../components/shared/ApptCard';
import { useBusinessSocket } from '../../hooks/useBusinessSocket';
import api from '../../services/api';

export default function StaffDashboardPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id;
  const qc = useQueryClient();
  const [showPast, setShowPast] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useBusinessSocket(bid, {
    onNewAppointment: () => qc.invalidateQueries({ queryKey: ['staff-today-appts'] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['staff-today-appts', bid, today],
    queryFn: () => api.get('/appointments', {
      params: { businessId: bid, from: today, to: today, per_page: 50 },
    }).then(r => r.data),
    enabled: !!bid,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => api.patch(`/appointments/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-today-appts'] }),
  });

  const sorted: any[] = (data?.data ?? []).sort(
    (a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const upcoming = sorted.filter(a => !isArchived(a));
  const past = sorted.filter(a => isArchived(a));

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Bugün randevu yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 text-sm">Kalan randevu yok.</p>
            </div>
          )}

          {upcoming.map((a: any) => (
            <ApptCard key={a.id} appt={a} actions="staff"
              onAction={(id, act) => action.mutate({ id, act })}
              isPending={action.isPending} />
          ))}

          {past.length > 0 && (
            <div className="pt-2">
              <button onClick={() => setShowPast(v => !v)}
                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors mb-3">
                <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} />
                Geçmiş randevular ({past.length})
              </button>
              {showPast && (
                <div className="space-y-3 opacity-60">
                  {past.map((a: any) => (
                    <ApptCard key={a.id} appt={a} actions="staff"
                      onAction={(id, act) => action.mutate({ id, act })}
                      isPending={action.isPending} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
