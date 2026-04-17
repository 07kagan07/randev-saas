import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import axios from 'axios';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const bid = user?.business_id!;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '', phone: '', address: '', description: '', slot_interval_minutes: 30,
  });
  const [slug, setSlug] = useState('');
  const [notif, setNotif] = useState({
    sms_on_new: true, sms_on_cancel: true, sms_reminder: true, reminder_minutes_before: 60,
  });
  const [saved, setSaved] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ticket, setTicket] = useState({ subject: '', message: '' });
  const [ticketSent, setTicketSent] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const { data: bizData } = useQuery({
    queryKey: ['business', bid],
    queryFn: () => api.get(`/businesses/${bid}`).then(r => r.data),
    enabled: !!bid,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notif-settings', bid],
    queryFn: () => api.get(`/businesses/${bid}/notification-settings`).then(r => r.data),
    enabled: !!bid,
  });

  useEffect(() => {
    const b = bizData?.data;
    if (b) {
      setForm({ name: b.name ?? '', phone: b.phone ?? '', address: b.address ?? '', description: b.description ?? '', slot_interval_minutes: b.slot_interval_minutes ?? 30 });
      setSlug(b.slug ?? '');
    }
  }, [bizData]);

  useEffect(() => {
    const n = notifData?.data;
    if (n) setNotif({ sms_on_new: n.sms_on_new, sms_on_cancel: n.sms_on_cancel, sms_reminder: n.sms_reminder, reminder_minutes_before: n.reminder_minutes_before });
  }, [notifData]);

  const saveBiz = useMutation({
    mutationFn: () => api.patch(`/businesses/${bid}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business', bid] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const saveNotif = useMutation({
    mutationFn: () => api.patch(`/businesses/${bid}/notification-settings`, notif),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-settings', bid] }); setSavedNotif(true); setTimeout(() => setSavedNotif(false), 2000); },
  });

  const sendTicket = useMutation({
    mutationFn: () => api.post(`/businesses/${bid}/support-tickets`, ticket),
    onSuccess: () => { setTicket({ subject: '', message: '' }); setTicketSent(true); setTimeout(() => setTicketSent(false), 3000); },
  });

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


      {/* İşletme Bilgileri */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">İşletme Bilgileri</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Randevu Linki</label>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
              <span className="inline-flex items-center px-3 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">site.com/</span>
              <span className="flex-1 px-3 py-2 text-sm text-gray-700 select-all">{slug}</span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="px-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border-l border-gray-200 transition-colors"
              >
                {copied ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600">Kopyalandı</span></> : <><Copy className="w-4 h-4" /><span>Kopyala</span></>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Randevu Slot Aralığı (dakika)</label>
            <p className="text-xs text-gray-400 mb-2">Müşteriye sunulan saat seçenekleri arasındaki süre. Örn: 30 dk → 09:00, 09:30, 10:00…</p>
            <select value={form.slot_interval_minutes}
              onChange={e => setForm(f => ({ ...f, slot_interval_minutes: Number(e.target.value) }))}
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[10, 15, 20, 30, 45, 60, 90, 120].map(v => (
                <option key={v} value={v}>{v} dakika</option>
              ))}
            </select>
          </div>
          <button onClick={() => saveBiz.mutate()} disabled={saveBiz.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
            {saved ? '✓ Kaydedildi' : saveBiz.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Bildirim Ayarları */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">SMS Bildirim Ayarları</h2>
        <div className="space-y-4">
          {([
            { key: 'sms_on_new', label: 'Yeni randevuda müşteriye SMS gönder' },
            { key: 'sms_on_cancel', label: 'İptal/redde müşteriye SMS gönder' },
            { key: 'sms_reminder', label: "Randevu hatırlatma SMS'i gönder" },
          ] as const).map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notif[item.key]}
                onChange={e => setNotif(n => ({ ...n, [item.key]: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
          {notif.sms_reminder && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hatırlatma ne kadar önce? (dakika)</label>
              <input type="number" min={15} max={1440} value={notif.reminder_minutes_before}
                onChange={e => setNotif(n => ({ ...n, reminder_minutes_before: Number(e.target.value) }))}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <button onClick={() => saveNotif.mutate()} disabled={saveNotif.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
            {savedNotif ? '✓ Kaydedildi' : saveNotif.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* QR Kod */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">QR Kod</h2>
        <p className="text-sm text-gray-500 mb-4">Müşterileriniz bu QR kodu okutarak randevu sayfanıza ulaşabilir.</p>
        <button
          onClick={downloadQr}
          disabled={qrLoading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
        >
          {qrLoading ? 'İndiriliyor...' : '↓ QR Kod İndir (PNG)'}
        </button>
      </div>

      {/* Destek Talebi */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Destek Talebi</h2>
        <p className="text-sm text-gray-500 mb-4">Bir sorunuz veya sorununuz mu var? Bize bildirin.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
            <input
              value={ticket.subject}
              onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Randevu senkronizasyon sorunu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={ticket.message}
              onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Sorunu detaylı açıklayın..."
            />
          </div>
          {ticketSent && <p className="text-green-600 text-sm">✓ Talebiniz iletildi, en kısa sürede dönüş yapılacak.</p>}
          <button
            onClick={() => sendTicket.mutate()}
            disabled={sendTicket.isPending || ticket.subject.length < 3 || ticket.message.length < 10}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
          >
            {sendTicket.isPending ? 'Gönderiliyor...' : 'Talep Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}
