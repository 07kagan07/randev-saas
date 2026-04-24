import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly apiHash: string;
  private readonly sender: string;
  private readonly apiUrl = 'https://api.iletimerkezi.com/v1/send-sms/get/';

  constructor(private readonly config: ConfigService) {
    this.apiKey  = config.get<string>('ILETIMERKEZI_API_KEY', '');
    this.apiHash = config.get<string>('ILETIMERKEZI_HASH', '');
    this.sender  = config.get<string>('ILETIMERKEZI_SENDER', '');
  }

  async sendSms(phone: string, message: string): Promise<void> {
    // Dev mode: gerçek SMS gönderme, OTP'yi log'a yaz
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.warn(`[DEV-SMS] ${phone} → ${message}`);
      return;
    }

    if (!this.apiKey || !this.apiHash) {
      this.logger.warn(`SMS gönderilemedi (key/hash eksik): ${phone} → ${message}`);
      return;
    }

    const number = this.normalizePhone(phone);

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          hash: this.apiHash,
          text: message,
          receipents: number,
          sender: this.sender,
          iys: 0,
        },
        timeout: 10000,
      });

      const body: string = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      if (body.includes('<code>200</code>') || body.includes('<code>1</code>')) {
        this.logger.log(`SMS gönderildi: ${number}`);
      } else {
        this.logger.error(`SMS API hatası: ${number} → ${body}`);
      }
    } catch (error) {
      this.logger.error(`SMS gönderme hatası: ${number}`, error?.message);
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Randevu dogrulama kodunuz: ${otp}. Kod 5 dakika gecerlidir.`;
    await this.sendSms(phone, message);
  }

  async sendAppointmentConfirmed(
    phone: string,
    params: {
      customerName: string;
      businessName: string;
      date: string;
      time: string;
      serviceName: string;
      staffName: string;
      actionLink: string;
    },
  ): Promise<void> {
    const message =
      `Merhaba ${params.customerName}, ` +
      `${params.businessName} randevunuz onaylandi. ` +
      `${params.date} ${params.time} - ${params.serviceName}. ` +
      `Iptal/erteleme: ${params.actionLink}`;
    await this.sendSms(phone, message);
  }

  async sendAppointmentReminder(
    phone: string,
    params: {
      customerName: string;
      businessName: string;
      date: string;
      time: string;
      actionLink: string;
    },
  ): Promise<void> {
    const message =
      `Merhaba ${params.customerName}, ` +
      `${params.businessName} randevunuzu hatirlatiyoruz. ` +
      `${params.date} ${params.time}. ` +
      `Iptal/erteleme: ${params.actionLink}`;
    await this.sendSms(phone, message);
  }

  async sendAppointmentRejected(
    phone: string,
    params: {
      customerName: string;
      date: string;
      time: string;
      reason: string;
      vitrinLink: string;
    },
  ): Promise<void> {
    const message =
      `Merhaba ${params.customerName}, ` +
      `${params.date} ${params.time} randevunuz onaylanamadi. ` +
      `Sebep: ${params.reason}. ` +
      `Yeni randevu: ${params.vitrinLink}`;
    await this.sendSms(phone, message);
  }

  async sendAppointmentCancelled(
    phone: string,
    params: { customerName: string; date: string; time: string },
  ): Promise<void> {
    const message =
      `Merhaba ${params.customerName}, ` +
      `${params.date} ${params.time} randevunuz iptal edildi.`;
    await this.sendSms(phone, message);
  }

  private normalizePhone(phone: string): string {
    // DB'de E.164 formatı: +905551234567
    // İletimerkezi sadece Türkiye numaralarını kabul eder → 5xxxxxxxxx (10 hane)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('90') && cleaned.length === 12) return cleaned.slice(2);
    if (cleaned.startsWith('0')  && cleaned.length === 11)  return cleaned.slice(1);
    if (cleaned.length === 10)   return cleaned;
    // Türkiye dışı numara → İletimerkezi bunu gönderemez; log yaz, devam et
    this.logger.warn(`SMS: Türkiye dışı numara, gönderilemiyor: ${phone}`);
    return cleaned; // Provider reject edecek, uygulama çökmeyecek
  }
}
