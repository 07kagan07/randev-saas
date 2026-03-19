import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { User } from './user.entity';
import { Service } from './service.entity';
import { AppointmentLog } from './appointment-log.entity';

export enum AppointmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  staff_id: string;

  @Column({ type: 'uuid' })
  service_id: string;

  @Column({ length: 255 })
  customer_name: string;

  @Column({ length: 20 })
  customer_phone: string;

  @Column({ type: 'timestamptz' })
  start_at: Date;

  @Column({ type: 'timestamptz' })
  end_at: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  action_token: string | null;

  @Column({ default: false })
  action_token_used: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  action_token_expires_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // İlişkiler
  @ManyToOne(() => Business, (business) => business.appointments)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => User, (user) => user.appointments)
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @ManyToOne(() => Service, (service) => service.appointments)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @OneToMany(() => AppointmentLog, (log) => log.appointment)
  logs: AppointmentLog[];
}
