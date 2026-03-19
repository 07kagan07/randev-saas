import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Business, SubscriptionPlan } from '../database/entities/business.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { User } from '../database/entities/user.entity';
import { Service } from '../database/entities/service.entity';

export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: {
    monthly_appointments: 50,
    staff: 2,
    services: 5,
    sms: false,
    whatsapp: false,
    reporting: 'basic',
  },
  [SubscriptionPlan.PRO]: {
    monthly_appointments: 500,
    staff: 10,
    services: 50,
    sms: true,
    whatsapp: true,
    reporting: 'advanced',
  },
  [SubscriptionPlan.BUSINESS]: {
    monthly_appointments: Infinity,
    staff: Infinity,
    services: Infinity,
    sms: true,
    whatsapp: true,
    reporting: 'advanced',
  },
};

@Injectable()
export class PlanLimitService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  async checkMonthlyAppointmentLimit(businessId: string): Promise<void> {
    const business = await this.businessRepo.findOneOrFail({ where: { id: businessId } });
    const limit = PLAN_LIMITS[business.subscription_plan];

    if (limit.monthly_appointments === Infinity) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.appointmentRepo.count({
      where: {
        business_id: businessId,
        created_at: MoreThanOrEqual(startOfMonth),
      },
    });

    if (count >= limit.monthly_appointments) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        message: 'Bu işletme bu ay için randevu kapasitesine ulaştı. Lütfen işletmeyi arayın.',
        message_en: 'This business has reached its monthly appointment limit. Please call the business.',
      });
    }
  }

  async getUsageInfo(businessId: string): Promise<{
    plan: string;
    monthly_appointments: { used: number; limit: number | string; percent: number };
    staff: { used: number; limit: number | string };
    services: { used: number; limit: number | string };
    warn: boolean;
  }> {
    const business = await this.businessRepo.findOneOrFail({ where: { id: businessId } });
    const limit = PLAN_LIMITS[business.subscription_plan];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [appointmentCount, staffCount, serviceCount] = await Promise.all([
      this.appointmentRepo.count({
        where: { business_id: businessId, created_at: MoreThanOrEqual(startOfMonth) },
      }),
      this.userRepo.count({ where: { business_id: businessId, role: 'staff' as any, is_active: true } }),
      this.serviceRepo.count({ where: { business_id: businessId, is_active: true } }),
    ]);

    const maxAppt = limit.monthly_appointments;
    const percent = maxAppt === Infinity ? 0 : Math.round((appointmentCount / maxAppt) * 100);

    return {
      plan: business.subscription_plan,
      monthly_appointments: {
        used: appointmentCount,
        limit: maxAppt === Infinity ? 'unlimited' : maxAppt,
        percent,
      },
      staff: {
        used: staffCount,
        limit: limit.staff === Infinity ? 'unlimited' : limit.staff,
      },
      services: {
        used: serviceCount,
        limit: limit.services === Infinity ? 'unlimited' : limit.services,
      },
      warn: percent >= 80,
    };
  }

  async checkStaffLimit(businessId: string): Promise<void> {
    const business = await this.businessRepo.findOneOrFail({ where: { id: businessId } });
    const limit = PLAN_LIMITS[business.subscription_plan];

    if (limit.staff === Infinity) return;

    const count = await this.userRepo.count({
      where: { business_id: businessId, role: 'staff' as any, is_active: true },
    });

    if (count >= limit.staff) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        message: `Bu planda en fazla ${limit.staff} personel ekleyebilirsiniz. Plan yükseltmek için destek ekibiyle iletişime geçin.`,
        message_en: `Your plan allows a maximum of ${limit.staff} staff members. Please upgrade your plan.`,
      });
    }
  }

  async checkServiceLimit(businessId: string): Promise<void> {
    const business = await this.businessRepo.findOneOrFail({ where: { id: businessId } });
    const limit = PLAN_LIMITS[business.subscription_plan];

    if (limit.services === Infinity) return;

    const count = await this.serviceRepo.count({
      where: { business_id: businessId, is_active: true },
    });

    if (count >= limit.services) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        message: `Bu planda en fazla ${limit.services} hizmet ekleyebilirsiniz.`,
        message_en: `Your plan allows a maximum of ${limit.services} services.`,
      });
    }
  }
}
