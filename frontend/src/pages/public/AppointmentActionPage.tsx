import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

type State = 'loading' | 'confirm' | 'success' | 'error';

export default function AppointmentActionPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const action = params.get('action'); // 'cancel' | 'reschedule'

  const [state, setState] = useState<State>('confirm');
  const [message, setMessage] = useState('');
  const [apptInfo, setApptInfo] = useState<any>(null);

  // Fetch appointment info by token
  useEffect(() => {
    if (!token) return;
    api.get('/appointments/action', { params: { token } })
      .then(r => setApptInfo(r.data?.data))
      .catch(() => { setState('error'); setMessage('Geçersiz veya süresi dolmuş link.'); });
  }, [token]);

  const handleAction = () => {
    if (!token) return;
    setState('loading');
    api.post('/appointments/action', { token, action })
      .then(() => { setState('success'); setMessage(action === 'cancel' ? 'Randevunuz iptal edildi.' : 'Randevunuz ertelendi.'); })
      .catch(err => { setState('error'); setMessage(err?.response?.data?.message ?? 'Bir hata oluştu.'); });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-700 font-medium">Geçersiz link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
        {state === 'loading' && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          </div>
        )}

        {state === 'confirm' && (
          <>
            <p className="text-4xl mb-4">{action === 'cancel' ? '❌' : '🔄'}</p>
            <h1 className="text-lg font-bold text-gray-900 mb-2">
              {action === 'cancel' ? 'Randevuyu İptal Et' : 'Randevuyu Ertele'}
            </h1>
            {apptInfo && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-left mb-4">
                <p className="text-gray-500">Hizmet: <span className="font-medium text-gray-800">{apptInfo.service?.name}</span></p>
                <p className="text-gray-500 mt-1">Tarih: <span className="font-medium text-gray-800">
                  {new Date(apptInfo.start_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span></p>
              </div>
            )}
            <p className="text-gray-500 text-sm mb-6">
              {action === 'cancel'
                ? 'Bu randevuyu iptal etmek istediğinizden emin misiniz?'
                : 'Bu randevuyu ertelemek istediğinizden emin misiniz?'}
            </p>
            <button onClick={handleAction}
              className={`w-full py-3 rounded-xl font-medium text-white mb-3 ${action === 'cancel' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {action === 'cancel' ? 'Evet, İptal Et' : 'Evet, Ertele'}
            </button>
            <button onClick={() => window.history.back()} className="w-full py-3 rounded-xl font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
              Vazgeç
            </button>
          </>
        )}

        {state === 'success' && (
          <>
            <p className="text-4xl mb-4">✓</p>
            <h1 className="text-lg font-bold text-gray-900 mb-2">İşlem Tamamlandı</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
          </>
        )}

        {state === 'error' && (
          <>
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Hata</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
