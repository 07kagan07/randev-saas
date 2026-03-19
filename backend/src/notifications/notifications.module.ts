import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmsService } from './sms/sms.service';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';
import { NotificationProcessor } from './notification.processor';
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
      { name: 'notification-queue' },
      { name: 'reminder-queue' },
      { name: 'cleanup-queue' },
    ),
  ],
  providers: [SmsService, WhatsappService, PushService, NotificationProcessor],
  exports: [SmsService, WhatsappService, PushService, BullModule],
})
export class NotificationsModule {}
