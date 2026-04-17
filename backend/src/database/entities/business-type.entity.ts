import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export interface TemplateService {
  name: string;
  duration_minutes: number;
  price: number;
  category?: string;
}

export interface BookingFormField {
  key: string;
  label: string;
  type: 'text' | 'tel' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select type
}

@Entity('business_types')
export class BusinessType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  template_services: TemplateService[];

  @Column({ type: 'simple-json', default: '[]' })
  booking_form_fields: BookingFormField[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
