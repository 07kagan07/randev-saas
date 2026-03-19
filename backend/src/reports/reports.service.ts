import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { User } from '../database/entities/user.entity';
import { Service } from '../database/entities/service.entity';
import { Business } from '../database/entities/business.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async getOverview(businessId: string, from?: string, to?: string) {
    const { startDate, endDate } = this.parseDateRange(from, to);

    const appointments = await this.appointmentRepo.find({
      where: {
        business_id: businessId,
        start_at: Between(startDate, endDate),
      },
      relations: ['service', 'staff'],
    });

    // by_status
    const by_status: Record<string, number> = {};
    for (const a of appointments) {
      by_status[a.status] = (by_status[a.status] || 0) + 1;
    }

    // daily trend
    const dailyMap: Record<string, number> = {};
    for (const a of appointments) {
      const date = new Date(a.start_at).toISOString().slice(0, 10);
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // by_staff
    const by_staff: Record<string, number> = {};
    for (const a of appointments) {
      if (a.staff) {
        const name = a.staff.full_name || a.staff.phone;
        by_staff[name] = (by_staff[name] || 0) + 1;
      }
    }

    // by_service
    const by_service: Record<string, number> = {};
    for (const a of appointments) {
      if (a.service) {
        by_service[a.service.name] = (by_service[a.service.name] || 0) + 1;
      }
    }

    // total_revenue
    const total_revenue = appointments
      .filter((a) => a.status === AppointmentStatus.COMPLETED)
      .reduce((sum, a) => sum + (Number(a.service?.price) || 0), 0);

    return {
      data: {
        total: appointments.length,
        by_status,
        daily,
        by_staff,
        by_service,
        total_revenue,
      },
    };
  }

  async getHeatmap(businessId: string) {
    const appointments = await this.appointmentRepo.find({
      where: { business_id: businessId },
    });

    // 7 gün × 24 saat matris
    const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    for (const a of appointments) {
      const d = new Date(a.start_at);
      const day = (d.getUTCDay() + 6) % 7; // 0=Pzt...6=Paz
      const hour = d.getUTCHours();
      matrix[day][hour]++;
    }

    return {
      data: {
        days,
        matrix,
      },
    };
  }

  private parseDateRange(from?: string, to?: string): { startDate: Date; endDate: Date } {
    if (from && to) {
      return {
        startDate: new Date(from + 'T00:00:00.000Z'),
        endDate: new Date(to + 'T23:59:59.999Z'),
      };
    }
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
}
