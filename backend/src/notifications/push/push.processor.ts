import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PushService } from './push.service';
import { NotificationJob } from '../notification.processor';

@Processor('push-queue')
export class PushProcessor {
  private readonly logger = new Logger(PushProcessor.name);

  @Process({ concurrency: 10 })
  async handlePush(job: Job<NotificationJob>) {
    const { userIds, userId, params } = job.data;
    const ids = userIds ?? (userId ? [userId] : []);
    if (ids.length === 0) return;
    try {
      await this.pushService.sendToUsers(ids, params as any);
    } catch (error) {
      this.logger.error('Push gönderilemedi', error?.message);
      throw error; // Bull retry mekanizmasını tetikler
    }
  }

  constructor(private readonly pushService: PushService) {}
}
