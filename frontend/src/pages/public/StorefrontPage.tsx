import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SearchX, MapPin, Phone, Clock, ChevronRight, Navigation } from 'lucide-react';
import api from '../../services/api';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';
import DirectionsModal, { openDirections } from '../../components/shared/DirectionsModal';

// 0=Mon … 6=Sun — JS getDay(): 0=Sun,1=Mon…6=Sat
function todayDayOfWeek(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function StorefrontPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [directionsOpen, setDirectionsOpen] = useState(false);

  const { data: bizData, isLoading, isError } = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => api.get(`/businesses/slug/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  const biz = bizData?.data;

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

  const hours: any[] = ownerHoursData?.data ?? [];
  const todayIdx = todayDayOfWeek();
  const todayHour = hours.find((h: any) => h.day_of_week === todayIdx);
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
          <p className="text-gray-700 font-medium">{t('storefront.notFound')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('storefront.notFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 flex justify-end">
          <LanguageSwitcher variant="light" />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
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
                {isOpenToday
                  ? `${t('booking.openToday')}${todayHours}`
                  : t('booking.closedToday')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* CTA */}
        <Link
          to={`/${slug}/book`}
          className="flex items-center justify-between w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-md mb-4 transition-colors"
        >
          <span className="text-lg">{t('storefront.bookAppointment')}</span>
          <ChevronRight className="w-5 h-5" />
        </Link>

        {/* Contact buttons */}
        {(biz.phone || biz.maps_url || biz.apple_maps_url) && (
          <div className="flex gap-3 mb-8">
            {biz.phone && (
              <a
                href={`tel:${biz.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-2xl transition-colors text-sm"
              >
                <Phone className="w-4 h-4 text-indigo-500" />
                {t('storefront.call')}
              </a>
            )}
            {(biz.maps_url || biz.apple_maps_url) && (
              <button
                onClick={() => { if (!openDirections(biz.maps_url, biz.apple_maps_url)) setDirectionsOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-2xl transition-colors text-sm"
              >
                <Navigation className="w-4 h-4 text-indigo-500" />
                {t('storefront.getDirections')}
              </button>
            )}
          </div>
        )}

        {directionsOpen && (
          <DirectionsModal
            googleMapsUrl={biz.maps_url}
            appleMapsUrl={biz.apple_maps_url}
            onClose={() => setDirectionsOpen(false)}
          />
        )}

        {/* Working Hours */}
        {hours.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-900">{t('storefront.workingHours')}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {DAY_KEYS.map((key, i) => {
                const dayData = hours.find((h: any) => h.day_of_week === i);
                const isToday = i === todayIdx;
                const isOpen = dayData?.is_open;
                return (
                  <div key={key} className={`flex items-center justify-between px-4 py-2.5 ${isToday ? 'bg-indigo-50' : ''}`}>
                    <span className={`text-sm ${isToday ? 'font-semibold text-indigo-700' : 'text-gray-600'}`}>
                      {t(`common.days.${key}`)}
                    </span>
                    {isOpen ? (
                      <span className={`text-sm ${isToday ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                        {dayData.start_time?.slice(0, 5)} – {dayData.end_time?.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">{t('common.closed')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
