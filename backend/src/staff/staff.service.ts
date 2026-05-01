import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { BlockedPeriod } from '../database/entities/blocked-period.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { PlanLimitService } from '../businesses/plan-limit.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SetWorkingHoursDto } from './dto/set-working-hours.dto';
import { CreateBlockedPeriodDto } from './dto/create-blocked-period.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WorkingHours)
    private readonly workingHoursRepo: Repository<WorkingHours>,
    @InjectRepository(BlockedPeriod)
    private readonly blockedRepo: Repository<BlockedPeriod>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepo: Repository<StaffServiceEntity>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async create(businessId: string, dto: CreateStaffDto): Promise<User> {
    await this.planLimitService.checkStaffLimit(businessId);

    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException({
        code: 'PHONE_TAKEN',
        message: 'Bu telefon numarası zaten kayıtlı.',
        message_en: 'This phone number is already registered.',
      });
    }

    const staff = this.userRepo.create({
      ...dto,
      business_id: businessId,
      role: UserRole.STAFF,
    });
    const saved = await this.userRepo.save(staff);

    // Hizmet ataması
    if (dto.service_ids?.length) {
      await this.staffServiceRepo.save(
        dto.service_ids.map((serviceId) => ({
          staff_id: saved.id,
          service_id: serviceId,
        })),
      );
    }

    // Varsayılan çalışma saatlerini oluştur (tüm günler kapalı)
    const defaultHours = Array.from({ length: 7 }, (_, i) => ({
      staff_id: saved.id,
      day_of_week: i,
      is_open: false,
      start_time: null,
      end_time: null,
    }));
    await this.workingHoursRepo.save(defaultHours);

    return this.findOne(businessId, saved.id);
  }

  async findAll(businessId: string): Promise<User[]> {
    return this.userRepo.find({
      where: [
        { business_id: businessId, role: UserRole.STAFF },
        { business_id: businessId, role: UserRole.BUSINESS_ADMIN },
      ],
      relations: ['working_hours', 'staff_services', 'staff_services.service'],
      order: { full_name: 'ASC' },
      take: 200,
    });
  }

  async findOne(businessId: string, staffId: string): Promise<User> {
    const staff = await this.userRepo.findOne({
      where: { id: staffId, business_id: businessId, role: UserRole.STAFF },
      relations: ['working_hours', 'staff_services', 'staff_services.service'],
    });
    if (!staff) {
      throw new NotFoundException({
        code: 'STAFF_NOT_FOUND',
        message: 'Personel bulunamadı.',
        message_en: 'Staff member not found.',
      });
    }
    return staff;
  }

  async update(businessId: string, staffId: string, dto: UpdateStaffDto): Promise<User> {
    const staff = await this.findOne(businessId, staffId);

    const { service_ids, ...rest } = dto;
    Object.assign(staff, rest);
    await this.userRepo.save(staff);

    // Hizmet atamasını güncelle
    if (service_ids !== undefined) {
      await this.staffServiceRepo.delete({ staff_id: staffId });
      if (service_ids.length > 0) {
        await this.staffServiceRepo.save(
          service_ids.map((serviceId) => ({ staff_id: staffId, service_id: serviceId })),
        );
      }
    }

    return this.findOne(businessId, staffId);
  }

  async remove(businessId: string, staffId: string): Promise<void> {
    const staff = await this.findOne(businessId, staffId);

    const activeAppts = await this.appointmentRepo.count({
      where: {
        staff_id: staffId,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
      },
    });

    if (activeAppts > 0) {
      throw new BadRequestException({
        code: 'STAFF_HAS_APPOINTMENTS',
        message: `Bu personelin ${activeAppts} aktif randevusu var. Önce randevuları iptal edin.`,
        message_en: `This staff member has ${activeAppts} active appointments. Please cancel them first.`,
      });
    }

    await this.userRepo.remove(staff);
  }

  // ─── Çalışma Saatleri ─────────────────────────────────────────────────────

  async setWorkingHours(staffId: string, dto: SetWorkingHoursDto): Promise<WorkingHours[]> {
    const days = Object.entries(dto.schedule);

    for (const [dayStr, dayData] of days) {
      const dayOfWeek = parseInt(dayStr);
      await this.workingHoursRepo.upsert(
        {
          staff_id: staffId,
          day_of_week: dayOfWeek,
          is_open: dayData.is_open,
          start_time: dayData.is_open ? dayData.start_time : null,
          end_time: dayData.is_open ? dayData.end_time : null,
        },
        ['staff_id', 'day_of_week'],
      );
    }

    return this.workingHoursRepo.find({
      where: { staff_id: staffId },
      order: { day_of_week: 'ASC' },
    });
  }

  async getWorkingHours(staffId: string): Promise<WorkingHours[]> {
    return this.workingHoursRepo.find({
      where: { staff_id: staffId },
      order: { day_of_week: 'ASC' },
    });
  }

  // ─── Geçici Kapatma ───────────────────────────────────────────────────────

  async createBlockedPeriod(
    staffId: string,
    businessId: string,
    createdBy: string,
    dto: CreateBlockedPeriodDto,
  ): Promise<BlockedPeriod> {
    const startAt = new Date(dto.start_at);
    const endAt = new Date(dto.end_at);

    if (endAt <= startAt) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'Bitiş saati başlangıç saatinden sonra olmalıdır.',
        message_en: 'End time must be after start time.',
      });
    }

    const period = this.blockedRepo.create({
      staff_id: staffId,
      business_id: businessId,
      start_at: startAt,
      end_at: endAt,
      reason: dto.reason,
      created_by: createdBy,
    });

    return this.blockedRepo.save(period);
  }

  async getBlockedPeriods(
    staffId: string,
    from?: string,
    to?: string,
  ): Promise<BlockedPeriod[]> {
    const where: any = { staff_id: staffId };
    if (from) where.start_at = MoreThanOrEqual(new Date(from));
    if (to) where.end_at = LessThanOrEqual(new Date(to));

    return this.blockedRepo.find({
      where,
      order: { start_at: 'ASC' },
    });
  }

  async removeBlockedPeriod(staffId: string, periodId: string): Promise<void> {
    const period = await this.blockedRepo.findOne({
      where: { id: periodId, staff_id: staffId },
    });
    if (!period) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Kapatma kaydı bulunamadı.',
        message_en: 'Blocked period not found.',
      });
    }
    await this.blockedRepo.remove(period);
  }
}
