import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';

type Step = 'service' | 'staff' | 'slot' | 'form' | 'done';

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '' });
  const [createdAppt, setCreatedAppt] = useState<any>(null);

  const { data: bizData } = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => api.get(`/businesses/slug/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  const biz = bizData?.data;

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['storefront-services', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/services`).then(r => r.data),
    enabled: !!biz?.id,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['storefront-staff', biz?.id],
    queryFn: () => api.get(`/businesses/${biz.id}/staff`).then(r => r.data),
    enabled: !!biz?.id && step === 'staff',
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', biz?.id, selectedService?.id, selectedStaff?.id, selectedDate],
    queryFn: () => api.get(`/businesses/${biz.id}/availability`, {
      params: { serviceId: selectedService?.id, staffId: selectedStaff?.id, date: selectedDate },
    }).then(r => r.data),
    enabled: !!biz?.id && !!selectedService && step === 'slot',
  });

  const createAppt = useMutation({
    mutationFn: () => api.post('/appointments', {
      business_id: biz.id,
      service_id: selectedService.id,
      staff_id: selectedStaff?.id,
      start_at: selectedSlot,
      customer_name: form.customer_name,
      customer_phone: `+90${form.customer_phone.replace(/\D/g, '')}`,
    }),
    onSuccess: (res) => {
      setCreatedAppt(res.data?.data);
      setStep('done');
    },
  });

  const services: any[] = (servicesData?.data ?? []).filter((s: any) => s.is_active);
  const staffList: any[] = (staffData?.data ?? []).filter((s: any) => s.is_active);
  const slots: string[] = slotsData?.data ?? [];

  if (!biz && !bizData) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link to={`/${slug}`} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></Link>
        <span className="font-semibold text-gray-800">{biz?.name ?? ''}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {(['service', 'staff', 'slot', 'form'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step === s ? 'bg-indigo-600 text-white' : (['service', 'staff', 'slot', 'form', 'done'].indexOf(step) > i) ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${(['service', 'staff', 'slot', 'form', 'done'].indexOf(step) > i) ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step: Service */}
        {step === 'service' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Hizmet Seçin</h2>
            {servicesLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : (
              <div className="space-y-3">
                {services.map(s => (
                  <button key={s.id} onClick={() => { setSelectedService(s); setStep('staff'); }}
                    className="w-full bg-white rounded-xl border border-gray-200 hover:border-indigo-400 px-4 py-3 flex items-center justify-between text-left transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                      {s.category && <p className="text-xs text-gray-400">{s.category}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-600">{Number(s.price).toLocaleString('tr-TR')} ₺</p>
                      <p className="text-xs text-gray-400">{s.duration_minutes} dk</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Staff */}
        {step === 'staff' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Personel Seçin</h2>
            <p className="text-xs text-gray-400 mb-4">Seçim yapmak istemiyorsanız "Fark Etmez" seçeneğini tercih edebilirsiniz.</p>
            {staffLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : (
              <div className="space-y-3">
                <button onClick={() => { setSelectedStaff(null); setStep('slot'); }}
                  className="w-full bg-white rounded-xl border border-gray-200 hover:border-indigo-400 px-4 py-3 text-left transition-colors">
                  <p className="font-medium text-gray-700 text-sm">Fark etmez</p>
                </button>
                {staffList.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStaff(s); setStep('slot'); }}
                    className="w-full bg-white rounded-xl border border-gray-200 hover:border-indigo-400 px-4 py-3 flex items-center gap-3 text-left transition-colors">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                      {(s.full_name || s.phone).charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{s.full_name || s.phone}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep('service')} className="mt-4 text-sm text-gray-400 hover:text-gray-600"><ChevronLeft className="w-4 h-4 inline" /> Geri</button>
          </div>
        )}

        {/* Step: Slot */}
        {step === 'slot' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Tarih & Saat Seçin</h2>
            <input type="date" value={selectedDate} min={new Date().toISOString().slice(0, 10)}
              onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4" />
            {slotsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : slots.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Bu tarihte müsait slot yok.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedSlot === slot
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'
                    }`}>
                    {new Date(slot).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
            {selectedSlot && (
              <button onClick={() => setStep('form')}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl">
                Devam Et →
              </button>
            )}
            <button onClick={() => setStep('staff')} className="mt-3 text-sm text-gray-400 hover:text-gray-600 block"><ChevronLeft className="w-4 h-4 inline" /> Geri</button>
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Bilgileriniz</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-sm">
              <p className="text-gray-500">Hizmet: <span className="font-medium text-gray-900">{selectedService?.name}</span></p>
              {selectedStaff && <p className="text-gray-500 mt-1">Personel: <span className="font-medium text-gray-900">{selectedStaff.full_name}</span></p>}
              <p className="text-gray-500 mt-1">Tarih/Saat: <span className="font-medium text-gray-900">
                {selectedSlot && new Date(selectedSlot).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ahmet Yılmaz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">+90</span>
                  <input value={form.customer_phone}
                    onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="flex-1 px-3 py-2.5 text-sm outline-none" placeholder="5xx xxx xxxx" />
                </div>
              </div>
              <button onClick={() => createAppt.mutate()}
                disabled={createAppt.isPending || !form.customer_name || form.customer_phone.length < 10}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl">
                {createAppt.isPending ? 'Randevu Alınıyor...' : 'Randevuyu Onayla'}
              </button>
              {createAppt.isError && (
                <p className="text-red-600 text-xs text-center">{(createAppt.error as any)?.response?.data?.message ?? 'Bir hata oluştu.'}</p>
              )}
            </div>
            <button onClick={() => setStep('slot')} className="mt-3 text-sm text-gray-400 hover:text-gray-600 block"><ChevronLeft className="w-4 h-4 inline" /> Geri</button>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Randevunuz Alındı!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Onay SMS'i telefonunuza gönderildi. Randevunuzu iptal etmek için SMS'teki linki kullanabilirsiniz.
            </p>
            <Link to={`/${slug}`} className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl">
              Ana Sayfaya Dön
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
