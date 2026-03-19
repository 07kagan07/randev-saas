import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import Redis from 'ioredis';
import { Business, SubscriptionPlan } from '../database/entities/business.entity';
import { User } from '../database/entities/user.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { SupportTicket, TicketStatus } from '../database/entities/support-ticket.entity';
import { REDIS_CLIENT } from '../config/redis.module';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async getBusinesses(query: any) {
    const { page = 1, per_page = 20, search, plan, category, is_active } = query;
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (plan) where.subscription_plan = plan;
    if (category) where.category = category;
    if (is_active !== undefined) where.is_active = is_active;

    const [items, total] = await this.businessRepo.findAndCount({
      where,
      skip: (page - 1) * per_page,
      take: per_page,
      order: { created_at: 'DESC' },
    });

    return { data: items, meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) } };
  }

  async getPlatformStats() {
    const [totalBusinesses, activeBusinesses, totalAppointments, totalUsers] = await Promise.all([
      this.businessRepo.count(),
      this.businessRepo.count({ where: { is_active: true } }),
      this.appointmentRepo.count(),
      this.userRepo.count(),
    ]);

    const planDist = await this.businessRepo
      .createQueryBuilder('b')
      .select('b.subscription_plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.subscription_plan')
      .getRawMany();

    return {
      businesses: { total: totalBusinesses, active: activeBusinesses, inactive: totalBusinesses - activeBusinesses },
      appointments: { total: totalAppointments },
      users: { total: totalUsers },
      plan_distribution: planDist,
    };
  }

  async updatePlan(businessId: string, plan: SubscriptionPlan, endsAt?: string): Promise<Business> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme bulunamadı.' });

    business.subscription_plan = plan;
    if (endsAt) business.subscription_ends_at = new Date(endsAt);
    return this.businessRepo.save(business);
  }

  async blockUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' });

    user.is_active = false;
    const saved = await this.userRepo.save(user);

    // Aktif token'ları blacklist'e al (tüm refresh token'larını sil)
    // Bu implementation için refresh token'ların kullanıcıya göre gruplanması gerekir
    // Şimdilik is_active=false kontrolü JWT strategy'de yapılıyor

    return saved;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' });
    await this.userRepo.remove(user);
  }

  async getTickets(query: any) {
    const { page = 1, per_page = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await this.ticketRepo.findAndCount({
      where,
      skip: (page - 1) * per_page,
      take: per_page,
      order: { created_at: 'DESC' },
    });

    return { data: items, meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) } };
  }

  async updateTicket(id: string, status: TicketStatus, adminNote?: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException({ message: 'Destek talebi bulunamadı.' });

    ticket.status = status;
    if (adminNote) ticket.admin_note = adminNote;
    return this.ticketRepo.save(ticket);
  }
}
