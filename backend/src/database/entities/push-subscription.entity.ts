import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text' })
  keys_auth: string;

  @Column({ type: 'text' })
  keys_p256dh: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // İlişkiler
  @ManyToOne(() => User, (user) => user.push_subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
