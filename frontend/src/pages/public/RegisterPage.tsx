import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import PhoneInput from '../../components/shared/PhoneInput';
import { DEFAULT_COUNTRY, validateE164Phone } from '../../data/countries';

type Step = 'info' | 'otp';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('info');
  const [form, setForm] = useState({ full_name: '', phone: DEFAULT_COUNTRY.dialCode });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !validateE164Phone(form.phone)) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: form.phone, mode: 'register' });
      setStep('otp');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'PHONE_EXISTS') {
        setError(t('auth.errors.phoneExists'));
      } else {
        setError(t('auth.errors.smsFailed'));
      }
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
        phone: form.phone,
        otp,
      });
      navigate('/login', { state: { phone: form.phone } });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'PHONE_EXISTS') {
        setError(t('auth.errors.phoneExists'));
      } else if (code === 'OTP_EXPIRED' || code === 'OTP_INVALID') {
        setError(t('auth.errors.otpInvalid'));
      } else {
        setError(t('auth.errors.genericError'));
      }
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
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.registerTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'info' ? t('auth.registerSubtitle') : t('auth.otpSubtitle')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'info' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.fullName')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('auth.fullNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.phone')} <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={form.phone}
                  onChange={v => setForm(f => ({ ...f, phone: v }))}
                />
                <p className="text-xs text-gray-400 mt-1">{t('auth.phoneForLogin')}</p>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading || !form.full_name.trim() || !validateE164Phone(form.phone)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? t('common.sending') : t('auth.sendOtp')}
              </button>

              <p className="text-center text-sm text-gray-500">
                {t('auth.hasAccount')}{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">{t('auth.loginLink')}</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center text-sm text-gray-600 bg-indigo-50 rounded-lg p-3">
                {t('auth.otpSentTo', { phone: form.phone })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.otp')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.otpPlaceholder')}
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
                {loading ? t('auth.verifyingAccount') : t('auth.verifyAccount')}
              </button>

              <button
                type="button"
                onClick={() => { setStep('info'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 inline" /> {t('auth.changeInfo')}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">{t('auth.termsNotice')}</p>
      </div>
    </div>
  );
}
