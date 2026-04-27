import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { AppointmentLog } from '../database/entities/appointment-log.entity';
import { Business, ApprovalMode } from '../database/entities/business.entity';
import { Service } from '../database/entities/service.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';
import { PlanLimitService } from '../businesses/plan-limit.service';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../events/events.gateway';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { AppointmentActionDto } from './dto/appointment-action.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(AppointmentLog)
    private readonly logRepo: Repository<AppointmentLog>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(NotificationSettings)
    private readonly notifSettingsRepo: Repository<NotificationSettings>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepo: Repository<StaffServiceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectQueue('notification-queue')
    private readonly notificationQueue: Queue,
    @InjectQueue('reminder-queue')
    private readonly reminderQueue: Queue,
    private readonly planLimitService: PlanLimitService,
    private readonly config: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── Randevu Oluştur (Guest) ───────────────────────────────────────────────

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    // 1. Plan limiti kontrolü
    await this.planLimitService.checkMonthlyAppointmentLimit(dto.business_id);

    // 2. İşletme ve hizmet bilgilerini al
    const [business, service] = await Promise.all([
      this.businessRepo.findOne({ where: { id: dto.business_id, is_active: true } }),
      this.serviceRepo.findOne({
        where: { id: dto.service_id, business_id: dto.business_id, is_active: true },
      }),
    ]);

    if (!business) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme bulunamadı.' });
    if (!service) throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Hizmet bulunamadı.' });

    const startAt = new Date(dto.start_at);
    const endAt = new Date(startAt.getTime() + service.duration_minutes * 60 * 1000);

    // 3. Personeli belirle — verilmediyse o slotta en uygun personeli otomatik ata
    let resolvedStaffId: string;
    if (dto.staff_id) {
      const found = await this.userRepo.findOne({
        where: { id: dto.staff_id, business_id: dto.business_id, is_active: true },
      });
      if (!found) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Personel bulunamadı.' });
      resolvedStaffId = dto.staff_id;
    } else {
      resolvedStaffId = await this.autoAssignStaff(dto.business_id, dto.service_id, startAt, endAt);
    }

    const staff = await this.userRepo.findOne({ where: { id: resolvedStaffId } });
    if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Personel bulunamadı.' });

    // 4. Transaction + Advisory Lock ile atomic kayıt
    return this.dataSource.transaction(async (manager) => {
      const lockKey = this.hashLock(resolvedStaffId + dto.start_at);
      await manager.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

      // Slot tekrar kontrol et (lock sonrası)
      const conflict = await manager.findOne(Appointment, {
        where: {
          staff_id: resolvedStaffId,
          start_at: startAt,
          status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED])),
        },
      });

      if (conflict) {
        throw new ConflictException({
          code: 'SLOT_NOT_AVAILABLE',
          message: 'Bu saat dilimi dolu, lütfen başka bir saat seçin.',
          message_en: 'This time slot is already taken. Please select another time.',
        });
      }

      const actionToken = uuidv4();
      const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const initialStatus = business.approval_mode === ApprovalMode.AUTO
        ? AppointmentStatus.APPROVED
        : AppointmentStatus.PENDING;

      const appointment = manager.create(Appointment, {
        business_id: dto.business_id,
        staff_id: resolvedStaffId,
        service_id: dto.service_id,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        start_at: startAt,
        end_at: endAt,
        status: initialStatus,
        notes: dto.notes,
        extra_fields: dto.extra_fields ?? {},
        action_token: actionToken,
        action_token_expires_at: tokenExpiresAt,
      });

      const saved = await manager.save(Appointment, appointment);

      await manager.save(AppointmentLog, {
        appointment_id: saved.id,
        changed_by: null,
        from_status: null,
        to_status: initialStatus,
        note: 'Randevu oluşturuldu',
      });

      setImmediate(() => this.scheduleNotifications(saved, business, service, staff));
      setImmediate(() => this.eventsGateway.broadcastNewAppointment(business.id, {
        ...saved,
        service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes, price: service.price },
        staff: staff ? { id: staff.id, full_name: staff.full_name } : null,
      }));

      return saved;
    });
  }

  // ─── Randevu Oluştur (Staff/Admin — throttle yok, her zaman APPROVED) ────────

  async createInternal(dto: CreateAppointmentDto, actor: User): Promise<Appointment> {
    await this.planLimitService.checkMonthlyAppointmentLimit(dto.business_id);

    if (actor.business_id !== dto.business_id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu işletmeye erişim yetkiniz yok.' });
    }

    const [business, service] = await Promise.all([
      this.businessRepo.findOne({ where: { id: dto.business_id, is_active: true } }),
      this.serviceRepo.findOne({
        where: { id: dto.service_id, business_id: dto.business_id, is_active: true },
      }),
    ]);

    if (!business) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme bulunamadı.' });
    if (!service) throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Hizmet bulunamadı.' });

    const startAt = new Date(dto.start_at);
    const endAt = new Date(startAt.getTime() + service.duration_minutes * 60 * 1000);

    let resolvedStaffId: string;
    if (dto.staff_id) {
      const found = await this.userRepo.findOne({
        where: { id: dto.staff_id, business_id: dto.business_id, is_active: true },
      });
      if (!found) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Personel bulunamadı.' });
      resolvedStaffId = dto.staff_id;
    } else {
      resolvedStaffId = await this.autoAssignStaff(dto.business_id, dto.service_id, startAt, endAt);
    }

    const staff = await this.userRepo.findOne({ where: { id: resolvedStaffId } });
    if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Personel bulunamadı.' });

    return this.dataSource.transaction(async (manager) => {
      const lockKey = this.hashLock(resolvedStaffId + dto.start_at);
      await manager.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

      const conflict = await manager.findOne(Appointment, {
        where: {
          staff_id: resolvedStaffId,
          start_at: startAt,
          status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED])),
        },
      });

      if (conflict) {
        throw new ConflictException({
          code: 'SLOT_NOT_AVAILABLE',
          message: 'Bu saat dilimi dolu, lütfen başka bir saat seçin.',
          message_en: 'This time slot is already taken. Please select another time.',
        });
      }

      const actionToken = uuidv4();
      const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const appointment = manager.create(Appointment, {
        business_id: dto.business_id,
        staff_id: resolvedStaffId,
        service_id: dto.service_id,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        start_at: startAt,
        end_at: endAt,
        status: AppointmentStatus.APPROVED,
        notes: dto.notes,
        extra_fields: dto.extra_fields ?? {},
        action_token: actionToken,
        action_token_expires_at: tokenExpiresAt,
      });

      const saved = await manager.save(Appointment, appointment);

      await manager.save(AppointmentLog, {
        appointment_id: saved.id,
        changed_by: actor.id,
        from_status: null,
        to_status: AppointmentStatus.APPROVED,
        note: 'Personel tarafından oluşturuldu',
      });

      setImmediate(() => this.scheduleNotifications(saved, business, service, staff));
      setImmediate(() => this.eventsGateway.broadcastNewAppointment(business.id, {
        ...saved,
        service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes, price: service.price },
        staff: staff ? { id: staff.id, full_name: staff.full_name } : null,
      }));

      return saved;
    });
  }

  // Verilen slot için bu hizmeti yapabilen, o slotta müsait, en az randevusu olan personeli seç
  private async autoAssignStaff(
    businessId: string,
    serviceId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<string> {
    // Bu hizmeti yapabilen aktif personel
    const staffServices = await this.staffServiceRepo.find({
      where: { service_id: serviceId },
      relations: ['staff'],
    });

    let candidates = staffServices
      .map((ss) => ss.staff)
      .filter((s) => s && s.business_id === businessId && s.is_active);

    if (candidates.length === 0) {
      candidates = await this.userRepo.find({
        where: { business_id: businessId, is_active: true },
      });
    }

    if (candidates.length === 0) {
      throw new NotFoundException({ code: 'NO_STAFF_AVAILABLE', message: 'Bu hizmet için uygun personel bulunamadı.' });
    }

    // Slotta çakışan randevusu olmayan personeli filtrele
    const available: User[] = [];
    for (const staff of candidates) {
      // Çakışma kontrolü — start_at < endAt && end_at > startAt
      const conflictingAppt = await this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.staff_id = :staffId', { staffId: staff.id })
        .andWhere('a.status NOT IN (:...cancelled)', {
          cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
        })
        .andWhere('a.start_at < :endAt', { endAt })
        .andWhere('a.end_at > :startAt', { startAt })
        .getOne();

      if (!conflictingAppt) available.push(staff);
    }

    if (available.length === 0) {
      throw new ConflictException({
        code: 'SLOT_NOT_AVAILABLE',
        message: 'Bu saat diliminde müsait personel yok.',
        message_en: 'No staff available for this time slot.',
      });
    }

    // Müsait personel arasından o gün en az randevusu olanı seç
    const dayStart = new Date(startAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    let bestStaff = available[0];
    let bestCount = Infinity;

    for (const staff of available) {
      const count = await this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.staff_id = :staffId', { staffId: staff.id })
        .andWhere('a.start_at >= :dayStart', { dayStart })
        .andWhere('a.start_at < :dayEnd', { dayEnd })
        .andWhere('a.status NOT IN (:...cancelled)', {
          cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
        })
        .getCount();

      if (count < bestCount) {
        bestCount = count;
        bestStaff = staff;
      }
    }

    return bestStaff.id;
  }

  // ─── Randevu Listele ───────────────────────────────────────────────────────

  async findAll(user: User, query: ListAppointmentsDto) {
    const { page = 1, per_page = 20, status, staff_id, date, from, to, search } = query;

    // business_admin kendi işletmesini görür; businessId query param ile de desteklenir
    const effectiveBusinessId = user.business_id;

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.staff', 'staff')
      .leftJoinAndSelect('a.service', 'service')
      .where('a.business_id = :businessId', { businessId: effectiveBusinessId });

    // Staff kendi randevularını görür
    if (user.role === UserRole.STAFF) {
      qb.andWhere('a.staff_id = :staffId', { staffId: user.id });
    } else if (staff_id) {
      qb.andWhere('a.staff_id = :staffId', { staffId: staff_id });
    }

    if (status) qb.andWhere('a.status = :status', { status });

    if (date) {
      qb.andWhere('DATE(a.start_at AT TIME ZONE \'UTC\') = :date', { date });
    } else {
      if (from) qb.andWhere('DATE(a.start_at AT TIME ZONE \'UTC\') >= :from', { from });
      if (to) qb.andWhere('DATE(a.start_at AT TIME ZONE \'UTC\') <= :to', { to });
    }

    if (search) {
      qb.andWhere(
        '(a.customer_name ILIKE :search OR a.customer_phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('a.start_at', 'DESC')
      .skip((page - 1) * per_page)
      .take(per_page)
      .getManyAndCount();

    return {
      data: items,
      meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
    };
  }

  async findOne(user: User, id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id, business_id: user.business_id! },
      relations: ['staff', 'service', 'logs'],
    });

    if (!appointment) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Randevu bulunamadı.' });
    }

    if (user.role === UserRole.STAFF && appointment.staff_id !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu randevuya erişim yetkiniz yok.' });
    }

    return appointment;
  }

  // ─── Durum Güncelleme ─────────────────────────────────────────────────────

  async approve(user: User, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Yalnızca bekleyen randevular onaylanabilir.' });
    }

    return this.updateStatus(appointment, AppointmentStatus.APPROVED, user.id, 'Onaylandı');
  }

  async reject(user: User, id: string, reason: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Yalnızca bekleyen randevular reddedilebilir.' });
    }

    appointment.rejection_reason = reason;
    await this.appointmentRepo.save(appointment);
    return this.updateStatus(appointment, AppointmentStatus.REJECTED, user.id, `Reddedildi: ${reason}`);
  }

  async complete(user: User, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);

    if (appointment.status !== AppointmentStatus.APPROVED) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Yalnızca onaylı randevular tamamlandı olarak işaretlenebilir.' });
    }

    return this.updateStatus(appointment, AppointmentStatus.COMPLETED, user.id, 'Tamamlandı');
  }

  async markNoShow(user: User, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);

    if (appointment.status !== AppointmentStatus.APPROVED) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Yalnızca onaylı randevular için "Gelmedi" işaretlenebilir.' });
    }

    return this.updateStatus(appointment, AppointmentStatus.NO_SHOW, user.id, 'Müşteri gelmedi');
  }

  async cancelByStaff(user: User, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);

    if (![AppointmentStatus.APPROVED, AppointmentStatus.PENDING].includes(appointment.status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Bu randevu iptal edilemez.' });
    }

    return this.updateStatus(appointment, AppointmentStatus.CANCELLED, user.id, 'Personel tarafından iptal edildi');
  }

  // ─── Token ile İptal / Ertele (Guest) ─────────────────────────────────────

  async getByToken(token: string): Promise<{
    id: string;
    customer_name: string;
    start_at: Date;
    end_at: Date;
    status: string;
    service_id: string;
    service: { name: string; duration_minutes: number };
    staff: { id: string; full_name: string | null };
    business: { id: string; name: string; slug: string; timezone: string };
    action_token_expires_at: Date | null;
    action_token_used: boolean;
  }> {
    const appointment = await this.appointmentRepo.findOne({
      where: { action_token: token as any },
      relations: ['business', 'service', 'staff'],
    });

    if (!appointment) {
      throw new BadRequestException({
        code: 'TOKEN_INVALID',
        message: 'Geçersiz veya kullanılmış bağlantı.',
        message_en: 'Invalid or already used link.',
      });
    }

    return {
      id: appointment.id,
      customer_name: appointment.customer_name,
      start_at: appointment.start_at,
      end_at: appointment.end_at,
      status: appointment.status,
      service_id: appointment.service_id,
      service: {
        name: appointment.service.name,
        duration_minutes: appointment.service.duration_minutes,
      },
      staff: {
        id: appointment.staff_id,
        full_name: appointment.staff?.full_name ?? null,
      },
      business: {
        id: appointment.business_id,
        name: appointment.business.name,
        slug: appointment.business.slug,
        timezone: appointment.business.timezone,
      },
      action_token_expires_at: appointment.action_token_expires_at,
      action_token_used: appointment.action_token_used,
    };
  }

  async handleAction(dto: AppointmentActionDto): Promise<{
    appointment_id: string;
    action: string;
    message: string;
    message_en: string;
  }> {
    const appointment = await this.appointmentRepo.findOne({
      where: { action_token: dto.token as any },
      relations: ['business', 'service', 'staff'],
    });

    if (!appointment) {
      throw new BadRequestException({
        code: 'TOKEN_INVALID',
        message: 'Geçersiz veya kullanılmış bağlantı.',
        message_en: 'Invalid or already used link.',
      });
    }

    if (appointment.action_token_used) {
      throw new BadRequestException({
        code: 'TOKEN_INVALID',
        message: 'Bu bağlantı daha önce kullanılmış.',
        message_en: 'This link has already been used.',
      });
    }

    const expiresAt = appointment.action_token_expires_at;
    if (expiresAt && new Date() > expiresAt) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'Bu bağlantının süresi dolmuş.',
        message_en: 'This link has expired.',
      });
    }

    if (appointment.status !== AppointmentStatus.APPROVED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: 'Bu randevu için işlem yapılamaz.',
        message_en: 'Action cannot be performed on this appointment.',
      });
    }

    if (dto.action === 'cancel') {
      await this.updateStatus(appointment, AppointmentStatus.CANCELLED, null, 'Müşteri tarafından iptal edildi');
      appointment.action_token_used = true;
      await this.appointmentRepo.save(appointment);

      return {
        appointment_id: appointment.id,
        action: 'cancelled',
        message: 'Randevunuz başarıyla iptal edildi.',
        message_en: 'Your appointment has been successfully cancelled.',
      };
    }

    if (dto.action === 'reschedule') {
      if (!dto.reschedule_date || !dto.reschedule_time) {
        throw new BadRequestException({
          code: 'MISSING_FIELDS',
          message: 'Yeni tarih ve saat girilmesi zorunludur.',
          message_en: 'New date and time are required for rescheduling.',
        });
      }

      const business = appointment.business;
      const timezone = business.timezone;
      const newStartLocal = DateTime.fromISO(`${dto.reschedule_date}T${dto.reschedule_time}`, { zone: timezone });
      const newStartUtc = newStartLocal.toUTC().toJSDate();
      const newEndUtc = new Date(newStartUtc.getTime() + appointment.service.duration_minutes * 60 * 1000);

      // Yeni slot müsait mi?
      const conflict = await this.appointmentRepo.findOne({
        where: {
          staff_id: appointment.staff_id,
          start_at: newStartUtc,
          status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED])),
        },
      });

      if (conflict && conflict.id !== appointment.id) {
        throw new ConflictException({
          code: 'SLOT_NOT_AVAILABLE',
          message: 'Seçtiğiniz saat dolu, lütfen başka bir saat seçin.',
          message_en: 'The selected time slot is not available.',
        });
      }

      // Mevcut randevuyu ertele, yeni randevu oluştur
      await this.updateStatus(appointment, AppointmentStatus.RESCHEDULED, null, 'Müşteri tarafından ertelendi');
      appointment.action_token_used = true;
      await this.appointmentRepo.save(appointment);

      const newActionToken = uuidv4();
      const newAppointment = this.appointmentRepo.create({
        business_id: appointment.business_id,
        staff_id: appointment.staff_id,
        service_id: appointment.service_id,
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        start_at: newStartUtc,
        end_at: newEndUtc,
        status: AppointmentStatus.APPROVED,
        action_token: newActionToken,
        action_token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
      await this.appointmentRepo.save(newAppointment);

      return {
        appointment_id: newAppointment.id,
        action: 'rescheduled',
        message: 'Randevunuz başarıyla ertelendi.',
        message_en: 'Your appointment has been successfully rescheduled.',
      };
    }

    throw new BadRequestException({ code: 'INVALID_ACTION', message: 'Geçersiz işlem.' });
  }

  // ─── Yardımcı Metodlar ────────────────────────────────────────────────────

  private async updateStatus(
    appointment: Appointment,
    newStatus: AppointmentStatus,
    changedBy: string | null,
    note?: string,
  ): Promise<Appointment> {
    const oldStatus = appointment.status;
    appointment.status = newStatus;
    const saved = await this.appointmentRepo.save(appointment);

    await this.logRepo.save({
      appointment_id: appointment.id,
      changed_by: changedBy,
      from_status: oldStatus,
      to_status: newStatus,
      note,
    });

    return saved;
  }

  private async scheduleNotifications(
    appointment: Appointment,
    business: Business,
    service: Service,
    staff: User,
  ): Promise<void> {
    const settings = await this.notifSettingsRepo.findOne({
      where: { business_id: business.id },
    });

    const timezone = business.timezone;
    const localTime = DateTime.fromJSDate(appointment.start_at, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('dd MMMM yyyy, HH:mm', { locale: 'tr' });

    const actionLink = `${this.config.get('APP_URL')}/appointments/action?token=${appointment.action_token}`;
    const vitrinLink = `${this.config.get('APP_URL')}/${business.slug}`;

    const params = {
      customerName: appointment.customer_name,
      businessName: business.name,
      date: localTime.split(',')[0],
      time: localTime.split(',')[1]?.trim(),
      serviceName: service.name,
      staffName: staff.full_name || 'Personel',
      actionLink,
      vitrinLink,
    };

    if (appointment.status === AppointmentStatus.APPROVED) {
      // Onay bildirimi gönder
      if (settings?.sms_enabled) {
        await this.notificationQueue.add({ type: 'sms', event: 'appointment.confirmed', phone: appointment.customer_phone, params });
      }
      if (settings?.whatsapp_enabled) {
        await this.notificationQueue.add({ type: 'whatsapp', event: 'appointment.confirmed', phone: appointment.customer_phone, params });
      }

      // Hatırlatma zamanla
      if (settings?.reminder_minutes) {
        const reminderAt = new Date(
          appointment.start_at.getTime() - settings.reminder_minutes * 60 * 1000,
        );
        const delay = reminderAt.getTime() - Date.now();
        if (delay > 0) {
          if (settings.sms_enabled) {
            await this.reminderQueue.add(
              { type: 'sms', event: 'appointment.reminder', phone: appointment.customer_phone, params },
              { delay },
            );
          }
          if (settings.whatsapp_enabled) {
            await this.reminderQueue.add(
              { type: 'whatsapp', event: 'appointment.reminder', phone: appointment.customer_phone, params },
              { delay },
            );
          }
        }
      }
    } else if (appointment.status === AppointmentStatus.PENDING) {
      // Admin/staff'e push gönder
      if (settings?.push_enabled) {
        await this.notificationQueue.add({
          type: 'push',
          event: 'appointment.pending',
          params: {
            title: 'Yeni Randevu İsteği',
            body: `${appointment.customer_name} — ${service.name}`,
            url: '/admin/appointments',
          },
        });
      }
    }
  }

  private hashLock(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32-bit integer
    }
    return Math.abs(hash);
  }
}
