import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
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
    private readonly config: ConfigService,
  ) {
    const publicKey  = config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY', '');
    const subject    = config.get<string>('VAPID_SUBJECT', 'mailto:admin@localhost');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID anahtarları eksik — push bildirimleri gönderilemez');
    }
  }

  async subscribe(
    userId: string,
    endpoint: string,
    keys: { auth: string; p256dh: string },
  ): Promise<void> {
    await this.pushSubRepo.upsert(
      { user_id: userId, endpoint, keys_auth: keys.auth, keys_p256dh: keys.p256dh },
      ['endpoint'],
    );
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    return this.sendToUsers([userId], payload);
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (userIds.length === 0) return;
    // Tek sorguda tüm kullanıcıların aboneliklerini çek
    const subscriptions = await this.pushSubRepo.find({
      where: { user_id: In(userIds) },
    });
    await Promise.all(subscriptions.map((sub) => this.sendPush(sub, payload)));
  }

  private async sendPush(sub: PushSubscription, payload: PushPayload): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
        JSON.stringify(payload),
      );
      this.logger.log(`Push gönderildi: ${sub.user_id}`);
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        // Abonelik süresi dolmuş veya iptal edilmiş — sil
        await this.pushSubRepo.delete({ endpoint: sub.endpoint });
        this.logger.warn(`Geçersiz push aboneliği silindi: ${sub.user_id}`);
      } else {
        this.logger.error(`Push gönderilemedi: ${sub.user_id}`, err?.message);
      }
    }
  }
}
