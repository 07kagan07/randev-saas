import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import axios from 'axios';

export default function StaffSharePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const bid = user?.business_id!;

  const [slug, setSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const { data: bizData } = useQuery({
    queryKey: ['business', bid],
    queryFn: () => api.get(`/businesses/${bid}`).then(r => r.data),
    enabled: !!bid,
  });

  useEffect(() => {
    const b = bizData?.data;
    if (b) setSlug(b.slug ?? '');
  }, [bizData]);

  const downloadQr = async () => {
    setQrLoading(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await axios.get(`/api/v1/businesses/${bid}/qr?format=png`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-randevu.png';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t('share.bookingLink')}</h2>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          <span className="flex-1 flex items-center px-3 py-2 text-sm text-gray-700 select-all overflow-hidden text-ellipsis whitespace-nowrap">
            {window.location.origin}/{slug}
          </span>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="px-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border-l border-gray-200 transition-colors"
          >
            {copied
              ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600">{t('common.copied')}</span></>
              : <><Copy className="w-4 h-4" /><span>{t('common.copy')}</span></>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">{t('share.qrCode')}</h2>
        <button onClick={downloadQr} disabled={qrLoading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg mt-3">
          {qrLoading ? t('common.downloading') : t('share.downloadQr')}
        </button>
      </div>
    </div>
  );
}
