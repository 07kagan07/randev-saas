import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';
import { Appointment } from './appointment.entity';
import { NotificationSettings } from './notification-settings.entity';
import { SupportTicket } from './support-ticket.entity';
import { BlockedPeriod } from './blocked-period.entity';
import { BusinessType } from './business-type.entity';

export enum BusinessCategory {
  BARBER = 'barber',
  HAIR_SALON = 'hair_salon',
  NAIL_ART = 'nail_art',
  CAR_SERVICE = 'car_service',
  CAR_WASH = 'car_wash',
  BEAUTY_CENTER = 'beauty_center',
  SPA = 'spa',
  OTHER = 'other',
}

export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
}

export enum ApprovalMode {
  AUTO = 'auto_approve',
  MANUAL = 'manual_approve',
}

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  maps_url: string | null;

  @Column({ type: 'text', nullable: true })
  apple_maps_url: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: BusinessCategory | null;

  @Column({ type: 'text', nullable: true })
  logo_url: string | null;

  @Column({ type: 'text', nullable: true })
  cover_url: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionPlan.FREE,
  })
  subscription_plan: SubscriptionPlan;

  @Column({ type: 'timestamptz', nullable: true })
  subscription_ends_at: Date | null;

  @Column({ length: 60, default: 'Europe/Istanbul' })
  timezone: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string | null; // ISO 3166-1 alpha-2 (TR, US, DE …)

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ApprovalMode.AUTO,
  })
  approval_mode: ApprovalMode;

  @Column({ default: false })
  onboarding_completed: boolean;

  @Column({ default: 0 })
  onboarding_step: number;

  @Column({ type: 'simple-json', default: '[]' })
  onboarding_skipped_steps: number[];

  @Column({ type: 'simple-json', default: '[]' })
  category_order: string[];

  @Column({ type: 'int', default: 30 })
  slot_interval_minutes: number;

  @Column({ type: 'boolean', default: false })
  show_prices: boolean;

  @Column({ type: 'uuid', nullable: true })
  business_type_id: string | null;

  @ManyToOne(() => BusinessType, { nullable: true, eager: false })
  @JoinColumn({ name: 'business_type_id' })
  business_type: BusinessType | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // İlişkiler
  @OneToMany(() => User, (user) => user.business)
  users: User[];

  @OneToMany(() => Service, (service) => service.business)
  services: Service[];

  @OneToMany(() => Appointment, (appt) => appt.business)
  appointments: Appointment[];

  @OneToMany(() => NotificationSettings, (ns) => ns.business)
  notification_settings: NotificationSettings;

  @OneToMany(() => SupportTicket, (ticket) => ticket.business)
  support_tickets: SupportTicket[];

  @OneToMany(() => BlockedPeriod, (bp) => bp.business)
  blocked_periods: BlockedPeriod[];
}
