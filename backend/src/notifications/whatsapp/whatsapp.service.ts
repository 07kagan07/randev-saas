import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    this.token = config.get<string>('WHATSAPP_API_TOKEN', '');
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(`WhatsApp gönderilemedi (config eksik): ${phone}`);
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.normalizePhone(phone),
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      this.logger.log(`WhatsApp gönderildi: ${phone}`);
    } catch (error) {
      this.logger.error(`WhatsApp gönderme hatası: ${phone}`, error?.message);
    }
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
      `Merhaba ${params.customerName},\n` +
      `${params.businessName} için randevunuz onaylandı ✅\n` +
      `📅 ${params.date} - ${params.time}\n` +
      `💈 ${params.serviceName} (${params.staffName})\n\n` +
      `İptal veya erteleme için:\n${params.actionLink}`;
    await this.sendMessage(phone, message);
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
      `Merhaba ${params.customerName},\n` +
      `Randevunuzu hatırlatırız 🔔\n` +
      `📅 ${params.date} - ${params.time}\n` +
      `📍 ${params.businessName}\n\n` +
      `İptal veya erteleme için:\n${params.actionLink}`;
    await this.sendMessage(phone, message);
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
      `Merhaba ${params.customerName},\n` +
      `${params.date} - ${params.time} randevunuz onaylanamadı.\n` +
      `Sebep: ${params.reason}\n\n` +
      `Yeni randevu için:\n${params.vitrinLink}`;
    await this.sendMessage(phone, message);
  }

  async sendAppointmentCancelled(
    phone: string,
    params: { customerName: string; date: string; time: string },
  ): Promise<void> {
    const message =
      `Merhaba ${params.customerName},\n` +
      `${params.date} - ${params.time} randevunuz iptal edildi.`;
    await this.sendMessage(phone, message);
  }

  private normalizePhone(phone: string): string {
    // Numara DB'de E.164 formatında saklanıyor (+xxxxxxxxxxx).
    // WhatsApp API'si + olmadan ister: "905551234567"
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    // Eski kayıtlar için fallback (+ yoksa dokunmadan gönder)
    return cleaned;
  }
}
