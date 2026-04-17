import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar } from 'lucide-react';
import api from '../../services/api';

type Step = 'info' | 'otp';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('info');
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || form.phone.length < 10) return;
    setError('');
    setLoading(true);
    try {
      // Önce numara daha önce kayıtlı mı kontrol etmek için direkt register denemiyoruz,
      // sadece OTP gönderiyoruz. Çakışma hatası register adımında döner.
      await api.post('/auth/send-otp', { phone: `+90${form.phone}` });
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'SMS gönderilemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', {
        full_name: form.full_name.trim(),
        phone: `+90${form.phone}`,
        otp,
      });
      navigate('/login', { state: { phone: form.phone } });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'OTP_EXPIRED' || code === 'OTP_INVALID') {
        setError(err.response.data.message);
      } else if (code === 'PHONE_EXISTS') {
        setError('Bu numara zaten kayıtlı. Giriş yapabilirsiniz.');
      } else {
        setError(err?.response?.data?.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hesap Oluştur</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'info' ? 'Ücretsiz başlayın, dilediğiniz zaman yükseltin.' : 'SMS ile gelen kodu girin'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {step === 'info' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ahmet Yılmaz"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">+90</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="flex-1 px-3 py-3 text-base outline-none"
                    placeholder="5xx xxx xxxx"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Bu numara ile giriş yapacaksınız.</p>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading || !form.full_name.trim() || form.phone.length < 10}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Zaten hesabınız var mı?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">Giriş Yap</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center text-sm text-gray-600 bg-indigo-50 rounded-lg p-3">
                <strong>+90 {form.phone}</strong> numarasına 6 haneli kod gönderildi.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doğrulama Kodu</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Hesap oluşturuluyor...' : 'Hesabı Onayla'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('info'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 inline" /> Bilgileri değiştir
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Kayıt olarak kullanım koşullarını kabul etmiş sayılırsınız.
        </p>
      </div>
    </div>
  );
}
