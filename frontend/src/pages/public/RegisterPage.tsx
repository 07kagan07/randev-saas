import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: '', owner_name: '', owner_phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.business_name || form.owner_phone.length < 10) return;
    setLoading(true);
    try {
      await api.post('/auth/register', {
        business_name: form.business_name,
        owner_name: form.owner_name || undefined,
        owner_phone: `+90${form.owner_phone}`,
      });
      // Kayıt başarılı → login'e yönlendir, telefon ile
      navigate('/login', { state: { phone: form.owner_phone } });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">İşletmenizi Kayıt Edin</h1>
          <p className="text-gray-500 text-sm mt-1">Ücretsiz başlayın, dilediğiniz zaman yükseltin.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı <span className="text-red-500">*</span></label>
            <input
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Örn: Ahmet Berber Salonu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad (opsiyonel)</label>
            <input
              value={form.owner_name}
              onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ahmet Yılmaz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon <span className="text-red-500">*</span></label>
            <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">+90</span>
              <input
                value={form.owner_phone}
                onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="flex-1 px-3 py-2.5 text-sm outline-none"
                placeholder="5xx xxx xxxx"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Bu numara ile giriş yapacaksınız.</p>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.business_name || form.owner_phone.length < 10}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">Giriş Yap</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Kayıt olarak kullanım koşullarını kabul etmiş sayılırsınız.
        </p>
      </div>
    </div>
  );
}
