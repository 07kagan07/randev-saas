import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SearchX, MapPin, Phone, Clock, ChevronRight } from 'lucide-react';
import api from '../../services/api';

// 0=Pzt … 6=Paz — JS getDay(): 0=Pazar,1=Pzt…6=Cmt
function todayDayOfWeek(): number {
  const js = new Date().getDay(); // 0=Sun
  return js === 0 ? 6 : js - 1;  // → 0=Pzt…6=Paz
}

function groupByCategory(services: any[], categoryOrder: string[]): { category: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const s of services) {
    const cat = s.category || 'Diğer';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  const ordered: { category: string; items: any[] }[] = [];
  for (const cat of categoryOrder) {
    if (map.has(cat)) { ordered.push({ category: cat, items: map.get(cat)! }); map.delete(cat); }
  }
  for (const [cat, items] of map) ordered.push({ category: cat, items });
  return ordered;
}

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: bizData, isLoading, isError } = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => api.get(`/businesses/slug/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  const biz = bizData?.data;

  const { data: servicesData } = useQuery({
    queryKey: ['storefront-services', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/services`).then(r => r.data),
    enabled: !!biz?.id,
  });

  // İşletme sahibinin çalışma saatlerini çek (bugün açık mı için)
  const { data: staffData } = useQuery({
    queryKey: ['storefront-staff', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/staff`).then(r => r.data),
    enabled: !!biz?.id,
  });

  const activeStaff: any[] = (staffData?.data ?? []).filter((s: any) => s.is_active);

  const { data: ownerHoursData } = useQuery({
    queryKey: ['storefront-hours', activeStaff[0]?.id],
    queryFn: () => api.get(`/staff/${activeStaff[0].id}/working-hours`).then(r => r.data),
    enabled: !!activeStaff[0]?.id,
  });

  const services: any[] = (servicesData?.data ?? []).filter((s: any) => s.is_active);
  const categoryOrder: string[] = biz?.category_order ?? [];
  const groups = groupByCategory(services, categoryOrder);

  // Bugünün çalışma saati
  const todayHour = (ownerHoursData?.data ?? []).find((h: any) => h.day_of_week === todayDayOfWeek());
  const isOpenToday = todayHour?.is_open;
  const todayHours = isOpenToday ? `${todayHour.start_time?.slice(0, 5)} – ${todayHour.end_time?.slice(0, 5)}` : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (isError || !biz) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">İşletme bulunamadı.</p>
          <p className="text-gray-400 text-sm mt-1">Bu adres geçersiz veya işletme kaldırılmış olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          {biz.logo_url ? (
            <img src={biz.logo_url} alt={biz.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-white/20" />
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
              {biz.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-3xl font-bold">{biz.name}</h1>
          {biz.description && <p className="mt-2 text-indigo-200 text-sm max-w-md mx-auto">{biz.description}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-indigo-300">
            {biz.address && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{biz.address}</span>
            )}
            {biz.phone && (
              <a href={`tel:${biz.phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                <Phone className="w-3 h-3" />{biz.phone}
              </a>
            )}
            {ownerHoursData && (
              <span className={`flex items-center gap-1 font-medium ${isOpenToday ? 'text-green-300' : 'text-red-300'}`}>
                <Clock className="w-3 h-3" />
                {isOpenToday ? `Bugün açık · ${todayHours}` : 'Bugün kapalı'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* CTA */}
        <Link
          to={`/${slug}/book`}
          className="flex items-center justify-between w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-md mb-8 transition-colors"
        >
          <span className="text-lg">Randevu Al</span>
          <ChevronRight className="w-5 h-5" />
        </Link>

        {/* Services */}
        {groups.length > 0 && (
          <div className="space-y-6">
            {groups.map(({ category, items }) => (
              <div key={category}>
                <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2 px-1">{category}</h2>
                <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {items.map(s => (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.duration_minutes} dk</p>
                      </div>
                      {s.show_price && s.price != null && (
                        <p className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                          {Number(s.price).toLocaleString('tr-TR')} ₺
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
