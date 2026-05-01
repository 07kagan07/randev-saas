import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Calendar, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import PhoneInput from '../../components/shared/PhoneInput';
import { DEFAULT_COUNTRY, parsePhoneE164, validateE164Phone } from '../../data/countries';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const statePhone = (location.state as any)?.phone ?? '';
  const parsedState = statePhone ? parsePhoneE164(statePhone) : null;
  const initialPhone = parsedState ? statePhone : (statePhone ? DEFAULT_COUNTRY.dialCode + statePhone : DEFAULT_COUNTRY.dialCode);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateE164Phone(phone)) { setError(t('auth.errors.invalidPhone')); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone, mode: 'login' });
      setStep('otp');
    } catch (err: any) {
      const code = err.response?.data?.error?.code;
      if (code === 'USER_NOT_FOUND') {
        setError(t('auth.errors.userNotFound'));
      } else {
        setError(t('auth.errors.smsFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError(t('auth.errors.otpInvalid')); return; }
    setError('');
    setLoading(true);
    try {
      await login(phone, otp);
      const role = useAuthStore.getState().user?.role;
      if (role === 'super_admin') navigate('/superadmin');
      else if (role === 'business_admin') {
        const ob = useAuthStore.getState().user?.onboarding_completed;
        navigate(ob === false ? '/admin/onboarding' : '/admin/appointments');
      }
      else if (role === 'staff') navigate('/staff/appointments');
      else navigate('/');
    } catch (err: any) {
      setError(t('auth.errors.otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.loginTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'phone' ? t('auth.loginSubtitle') : t('auth.otpSubtitle')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phone')}</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || !validateE164Phone(phone)}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors text-base"
              >
                {loading ? t('common.sending') : t('auth.sendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center text-sm text-gray-600 bg-indigo-50 rounded-xl p-3">
                {t('auth.otpSentTo', { phone })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.otp')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.otpPlaceholder')}
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  required
                />
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors text-base"
              >
                {loading ? t('common.loading') : t('auth.verifyOtp')}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 inline" /> {t('auth.changePhone')}
              </button>
            </form>
          )}
        </div>

        {step === 'phone' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">{t('auth.registerLink')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
