import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { WorkingHours } from './working-hours.entity';
import { BlockedPeriod } from './blocked-period.entity';
import { Appointment } from './appointment.entity';
import { AppointmentLog } from './appointment-log.entity';
import { StaffService } from './staff-service.entity';
import { PushSubscription } from './push-subscription.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  BUSINESS_ADMIN = 'business_admin',
  STAFF = 'staff',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  business_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  full_name: string | null;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // İlişkiler
  @ManyToOne(() => Business, (business) => business.users, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => WorkingHours, (wh) => wh.staff)
  working_hours: WorkingHours[];

  @OneToMany(() => BlockedPeriod, (bp) => bp.staff)
  blocked_periods: BlockedPeriod[];

  @OneToMany(() => Appointment, (appt) => appt.staff)
  appointments: Appointment[];

  @OneToMany(() => AppointmentLog, (log) => log.changed_by_user)
  appointment_logs: AppointmentLog[];

  @OneToMany(() => StaffService, (ss) => ss.staff)
  staff_services: StaffService[];

  @OneToMany(() => PushSubscription, (ps) => ps.user)
  push_subscriptions: PushSubscription[];
}
