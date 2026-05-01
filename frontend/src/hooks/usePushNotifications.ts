import { useEffect, useRef } from 'react';
import api from '../services/api';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

export function usePushNotifications() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Sadece izin zaten verilmişse sessizce subscribe ol — requestPermission() burada yok
    if (Notification.permission !== 'granted') return;

    attempted.current = true;

    (async () => {
      try {
        const { data: keyData } = await api.get('/businesses/push-vapid-key');
        const publicKey: string = keyData?.data?.publicKey;
        if (!publicKey) return;

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
        // sessizce geç
      }
    })();
  }, []);
}
