import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SearchX, MapPin, Phone } from 'lucide-react';
import api from '../../services/api';

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: bizData, isLoading, isError } = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => api.get(`/businesses/slug/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['storefront-services', bizData?.data?.id],
    queryFn: () => api.get(`/businesses/${bizData.data.id}/services`).then(r => r.data),
    enabled: !!bizData?.data?.id,
  });

  const biz = bizData?.data;
  const services: any[] = servicesData?.data ?? [];

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
            <img src={biz.logo_url} alt={biz.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
              {biz.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-3xl font-bold">{biz.name}</h1>
          {biz.description && <p className="mt-2 text-indigo-200 text-sm">{biz.description}</p>}
          {biz.address && <p className="mt-1 text-indigo-300 text-xs flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />{biz.address}</p>}
          {biz.phone && <p className="mt-1 text-indigo-300 text-xs flex items-center justify-center gap-1"><Phone className="w-3 h-3" />{biz.phone}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* CTA */}
        <Link
          to={`/${slug}/book`}
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl text-lg shadow-md mb-8"
        >
          Randevu Al →
        </Link>

        {/* Services */}
        {services.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Hizmetlerimiz</h2>
            <div className="space-y-3">
              {services.filter(s => s.is_active).map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                    {s.category && <p className="text-xs text-gray-400">{s.category}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-indigo-600">{Number(s.price).toLocaleString('tr-TR')} ₺</p>
                    <p className="text-xs text-gray-400">{s.duration_minutes} dk</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
