import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { SmsService } from './sms/sms.service';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';

export interface NotificationJob {
  type: 'sms' | 'whatsapp' | 'push';
  event: string;
  phone?: string;
  userId?: string;
  userIds?: string[];
  params: Record<string, any>;
}

@Processor('notification-queue')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    private readonly pushService: PushService,
  ) {}

  @Process()
  async handleNotification(job: Job<NotificationJob>) {
    const { type, event, phone, userId, userIds, params } = job.data;

    try {
      if (type === 'sms' && phone) {
        await this.dispatchSms(event, phone, params);
      } else if (type === 'whatsapp' && phone) {
        await this.dispatchWhatsapp(event, phone, params);
      } else if (type === 'push') {
        const ids = userIds || (userId ? [userId] : []);
        if (ids.length > 0) {
          await this.pushService.sendToUsers(ids, params as any);
        }
      }
    } catch (error) {
      this.logger.error(`Bildirim işleme hatası: ${event}`, error?.message);
    }
  }

  private async dispatchSms(
    event: string,
    phone: string,
    params: Record<string, any>,
  ) {
    switch (event) {
      case 'appointment.confirmed':
        return this.smsService.sendAppointmentConfirmed(phone, params as any);
      case 'appointment.rejected':
        return this.smsService.sendAppointmentRejected(phone, params as any);
      case 'appointment.cancelled':
        return this.smsService.sendAppointmentCancelled(phone, params as any);
      case 'appointment.reminder':
        return this.smsService.sendAppointmentReminder(phone, params as any);
      default:
        this.logger.warn(`Bilinmeyen SMS event: ${event}`);
    }
  }

  private async dispatchWhatsapp(
    event: string,
    phone: string,
    params: Record<string, any>,
  ) {
    switch (event) {
      case 'appointment.confirmed':
        return this.whatsappService.sendAppointmentConfirmed(phone, params as any);
      case 'appointment.rejected':
        return this.whatsappService.sendAppointmentRejected(phone, params as any);
      case 'appointment.cancelled':
        return this.whatsappService.sendAppointmentCancelled(phone, params as any);
      case 'appointment.reminder':
        return this.whatsappService.sendAppointmentReminder(phone, params as any);
      default:
        this.logger.warn(`Bilinmeyen WhatsApp event: ${event}`);
    }
  }
}
