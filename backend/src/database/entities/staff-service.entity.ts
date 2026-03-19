import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';

@Entity('staff_services')
export class StaffService {
  @PrimaryColumn({ type: 'uuid' })
  staff_id: string;

  @PrimaryColumn({ type: 'uuid' })
  service_id: string;

  // İlişkiler
  @ManyToOne(() => User, (user) => user.staff_services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @ManyToOne(() => Service, (service) => service.staff_services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
