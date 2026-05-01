import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
// ConfigModule is @Global so it's already available, but explicit import makes the dep clear
import { SmsService } from './sms/sms.service';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';
import { PushProcessor } from './push/push.processor';
import { NotificationProcessor } from './notification.processor';
import { ReminderProcessor } from './reminder.processor';
import { PushSubscription } from '../database/entities/push-subscription.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'notification-queue',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 200 },
      },
      {
        name: 'push-queue',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 200 },
      },
      {
        name: 'reminder-queue',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 200 },
      },
      { name: 'cleanup-queue' },
    ),
  ],
  providers: [SmsService, WhatsappService, PushService, PushProcessor, NotificationProcessor, ReminderProcessor],
  exports: [SmsService, WhatsappService, PushService, BullModule],
  // BullModule export'u tüm registerQueue'ları kapsar — push-queue dahil
})
export class NotificationsModule {}
