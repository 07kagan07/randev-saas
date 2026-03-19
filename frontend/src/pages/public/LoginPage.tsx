import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Calendar, ChevronLeft } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState((location.state as any)?.phone ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (value: string) => {
    // Sadece rakam, max 10 hane (5xx xxx xxxx)
    return value.replace(/\D/g, '').slice(0, 10);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) { setError('Geçerli bir telefon numarası girin.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: `+90${phone}` });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'SMS gönderilemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError('OTP kodunu girin.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(`+90${phone}`, otp);
      // login sonrası role göre yönlendir
      const role = useAuthStore.getState().user?.role;
      if (role === 'super_admin') navigate('/superadmin');
      else if (role === 'business_admin') {
        const ob = useAuthStore.getState().user?.onboarding_completed;
        navigate(ob === false ? '/admin/onboarding' : '/admin');
      }
      else if (role === 'staff') navigate('/staff');
      else navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kod hatalı. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Başlık */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Randevu Sistemi</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'phone' ? 'Giriş yapmak için telefon numaranızı girin' : 'SMS ile gelen kodu girin'}
          </p>
        </div>

        {/* Kart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                  <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
                    +90
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="5xx xxx xxxx"
                    className="flex-1 px-3 py-3 text-base outline-none bg-white"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-lg transition-colors text-base"
              >
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center text-sm text-gray-600 bg-indigo-50 rounded-lg p-3">
                <strong>+90 {phone}</strong> numarasına 6 haneli kod gönderildi.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doğrulama Kodu</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-lg transition-colors text-base"
              >
                {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 inline" /> Numarayı değiştir
              </button>
            </form>
          )}
        </div>

        {step === 'phone' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            İşletmeniz yok mu?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">Kayıt Olun</Link>
          </p>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2026 Randevu Sistemi
        </p>
      </div>
    </div>
  );
}
