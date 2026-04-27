import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, X } from 'lucide-react';

interface Props {
  googleMapsUrl?: string | null;
  appleMapsUrl?: string | null;
  onClose: () => void;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function openDirections(googleMapsUrl?: string | null, appleMapsUrl?: string | null): boolean {
  // iOS → modal göster (caller'ın kararı)
  if (isIOS()) return false;

  // Android / diğer → direkt Google Maps
  if (googleMapsUrl) {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false; // ne Google ne Apple varsa modal aç
}

export default function DirectionsModal({ googleMapsUrl, appleMapsUrl, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-5 pb-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Navigation className="w-4 h-4 text-indigo-500" />
            {t('storefront.directionsTitle')}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-4 w-full bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl px-4 py-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-white shadow-sm border border-gray-100">
                <svg viewBox="0 0 48 48" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z"/>
                  <circle cx="24" cy="18" r="5" fill="white"/>
                </svg>
              </div>
              <span className="font-medium text-gray-800">{t('storefront.googleMaps')}</span>
            </a>
          )}

          {appleMapsUrl && (
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-4 w-full bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl px-4 py-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <span className="font-medium text-gray-800">{t('storefront.appleMaps')}</span>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
