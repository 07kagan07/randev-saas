import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  business_id: string;

  // Hatırlatma: 60 | 120 | 180 | 1440 | 2880 dakika önce
  @Column({ type: 'integer', default: 60 })
  reminder_minutes: number;

  @Column({ default: true })
  sms_enabled: boolean;

  @Column({ default: true })
  whatsapp_enabled: boolean;

  @Column({ default: true })
  push_enabled: boolean;

  // İlişkiler
  @ManyToOne(() => Business, (business) => business.notification_settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
