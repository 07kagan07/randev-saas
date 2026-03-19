import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('working_hours')
@Unique(['staff_id', 'day_of_week'])
export class WorkingHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staff_id: string;

  // 0=Pazartesi, 1=Salı, 2=Çarşamba, 3=Perşembe, 4=Cuma, 5=Cumartesi, 6=Pazar
  @Column({ type: 'smallint' })
  day_of_week: number;

  @Column({ default: true })
  is_open: boolean;

  @Column({ type: 'time', nullable: true })
  start_time: string | null;

  @Column({ type: 'time', nullable: true })
  end_time: string | null;

  // İlişkiler
  @ManyToOne(() => User, (user) => user.working_hours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: User;
}
