import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const SESSION_KEY = 'push_prompt_dismissed';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

export default function PushPromptBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // İzni ilk sırada iste — browser gesture tüketilmeden önce olmalı
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setVisible(false); return; }

      const { data: keyData } = await api.get('/businesses/push-vapid-key');
      const publicKey: string = keyData?.data?.publicKey;
      if (!publicKey) { setVisible(false); return; }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const sub = subscription.toJSON();
      await api.post('/businesses/push-subscribe', {
        endpoint: sub.endpoint,
        keys: { auth: sub.keys!.auth, p256dh: sub.keys!.p256dh },
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-indigo-600 text-white px-4 py-2.5 flex items-center gap-3 shrink-0">
      <Bell className="w-4 h-4 shrink-0" />
      <p className="flex-1 text-sm">{t('push.promptDesc')}</p>
      <button
        onClick={handleEnable}
        disabled={loading}
        className="shrink-0 bg-white text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-60"
      >
        {loading ? '...' : t('push.enable')}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
        aria-label={t('push.dismiss')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
