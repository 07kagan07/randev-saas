import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { SmsService } from './sms/sms.service';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { NotificationJob } from './notification.processor';

@Processor('reminder-queue')
export class ReminderProcessor {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process()
  async handleReminder(job: Job<NotificationJob>) {
    const { type, phone, params } = job.data;
    try {
      if (type === 'sms' && phone) {
        await this.smsService.sendAppointmentReminder(phone, params as any);
        this.logger.log(`Hatırlatma SMS gönderildi: ${phone}`);
      } else if (type === 'whatsapp' && phone) {
        await this.whatsappService.sendAppointmentReminder(phone, params as any);
        this.logger.log(`Hatırlatma WhatsApp gönderildi: ${phone}`);
      }
    } catch (error) {
      this.logger.error(`Hatırlatma gönderilemedi: ${phone}`, error?.message);
    }
  }
}
