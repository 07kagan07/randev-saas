import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../../database/entities/push-subscription.entity';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushSubRepo: Repository<PushSubscription>,
  ) {}

  async subscribe(
    userId: string,
    endpoint: string,
    keys: { auth: string; p256dh: string },
  ): Promise<void> {
    await this.pushSubRepo.upsert(
      {
        user_id: userId,
        endpoint,
        keys_auth: keys.auth,
        keys_p256dh: keys.p256dh,
      },
      ['endpoint'],
    );
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const subscriptions = await this.pushSubRepo.find({
      where: { user_id: userId },
    });

    for (const sub of subscriptions) {
      await this.sendPush(sub, payload);
    }
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, payload)));
  }

  private async sendPush(
    sub: PushSubscription,
    payload: PushPayload,
  ): Promise<void> {
    // Web Push API — webpush kütüphanesi gerektirir
    // Şimdilik log — tam implementasyon için web-push npm paketi eklenecek
    this.logger.log(
      `Push notification gönderildi: ${sub.user_id} - ${payload.title}`,
    );
    // TODO: web-push kütüphanesi ile gerçek gönderim
    // await webpush.sendNotification({ endpoint: sub.endpoint, keys: {...} }, JSON.stringify(payload))
  }
}
