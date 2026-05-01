import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { DateTime } from 'luxon';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { BlockedPeriod } from '../database/entities/blocked-period.entity';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { Business } from '../database/entities/business.entity';
import { Service } from '../database/entities/service.entity';
import { User } from '../database/entities/user.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';

export type SlotUnavailableReason = 'past' | 'booked' | 'blocked';

export interface TimeSlot {
  start_local: string;
  end_local: string;
  start_utc: string;
  end_utc: string;
  available: boolean;
  reason?: SlotUnavailableReason; // available=false ise neden
  staff_id: string;
  staff_name?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(WorkingHours)
    private readonly workingHoursRepo: Repository<WorkingHours>,
    @InjectRepository(BlockedPeriod)
    private readonly blockedRepo: Repository<BlockedPeriod>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepo: Repository<StaffServiceEntity>,
  ) {}

  async getSlots(query: {
    business_id: string;
    service_id: string;
    staff_id?: string;
    date: string; // YYYY-MM-DD
  }): Promise<{
    date: string;
    timezone: string;
    service: { id: string; name: string; duration_minutes: number };
    slots: TimeSlot[];
  }> {
    // İşletme bilgisini al
    const business = await this.businessRepo.findOne({ where: { id: query.business_id } });
    if (!business) {
      throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme bulunamadı.' });
    }

    // Hizmet bilgisini al
    const service = await this.serviceRepo.findOne({
      where: { id: query.service_id, business_id: query.business_id, is_active: true },
    });
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Hizmet bulunamadı.' });
    }

    const timezone = business.timezone;
    const slotInterval = business.slot_interval_minutes ?? 30;

    // Personeli belirle
    let staffMembers: User[];
    if (query.staff_id) {
      const staff = await this.userRepo.findOne({
        where: { id: query.staff_id, business_id: query.business_id, is_active: true },
      });
      if (!staff) {
        throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Personel bulunamadı.' });
      }
      staffMembers = [staff];
    } else {
      // Bu hizmeti yapabilen tüm personeli getir
      const staffServices = await this.staffServiceRepo.find({
        where: { service_id: query.service_id },
        relations: ['staff'],
      });
      staffMembers = staffServices
        .map((ss) => ss.staff)
        .filter((s) => s && s.business_id === query.business_id && s.is_active);

      // Servise özel atama yoksa işletmenin tüm aktif personelini kullan
      if (staffMembers.length === 0) {
        staffMembers = await this.userRepo.find({
          where: { business_id: query.business_id, is_active: true },
        });
      }
    }

    if (staffMembers.length === 0) {
      return {
        date: query.date,
        timezone,
        service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes },
        slots: [],
      };
    }

    // Tarih gününü belirle (0=Pazartesi, ..., 6=Pazar)
    const dateTime = DateTime.fromISO(query.date, { zone: timezone });
    if (!dateTime.isValid) {
      throw new BadRequestException({ code: 'INVALID_DATE', message: 'Geçersiz tarih formatı.' });
    }

    const todayInTz = DateTime.now().setZone(timezone).startOf('day');
    if (dateTime < todayInTz) {
      throw new BadRequestException({ code: 'PAST_DATE', message: 'Geçmiş tarih için uygunluk sorgulanamaz.' });
    }

    // luxon: 1=Mon...7=Sun → bizim 0=Mon...6=Sun
    const dayOfWeek = dateTime.weekday - 1;

    const allSlots: TimeSlot[] = [];

    for (const staff of staffMembers) {
      const slots = await this.getSlotsForStaff(
        staff,
        service.duration_minutes,
        slotInterval,
        query.date,
        dayOfWeek,
        timezone,
      );
      allSlots.push(...slots);
    }

    // Personel seçilmediyse aynı saati birden fazla personelden gelince tekrarı önle.
    // Her unique start_utc için: available=true olan varsa onu al, yoksa ilkini al.
    let finalSlots: TimeSlot[];
    if (!query.staff_id) {
      const map = new Map<string, TimeSlot>();
      for (const slot of allSlots) {
        const existing = map.get(slot.start_utc);
        if (!existing || (!existing.available && slot.available)) {
          map.set(slot.start_utc, slot);
        }
      }
      finalSlots = Array.from(map.values());
    } else {
      finalSlots = allSlots;
    }

    finalSlots.sort((a, b) => a.start_utc.localeCompare(b.start_utc));

    return {
      date: query.date,
      timezone,
      service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes },
      slots: finalSlots,
    };
  }

  private async getSlotsForStaff(
    staff: User,
    durationMinutes: number,
    slotInterval: number,
    date: string,
    dayOfWeek: number,
    timezone: string,
  ): Promise<TimeSlot[]> {
    // Çalışma saatlerini al
    const workingHours = await this.workingHoursRepo.findOne({
      where: { staff_id: staff.id, day_of_week: dayOfWeek },
    });

    if (!workingHours || !workingHours.is_open || !workingHours.start_time || !workingHours.end_time) {
      return [];
    }

    // Çalışma başlangıç ve bitiş zamanlarını UTC'ye çevir
    const workStart = DateTime.fromISO(`${date}T${workingHours.start_time}`, { zone: timezone });
    const workEnd = DateTime.fromISO(`${date}T${workingHours.end_time}`, { zone: timezone });

    // Bloklu periyotları al (o gün için UTC aralık)
    const blockedPeriods = await this.blockedRepo
      .createQueryBuilder('bp')
      .where('bp.staff_id = :staffId', { staffId: staff.id })
      .andWhere('bp.start_at < :workEnd', { workEnd: workEnd.toUTC().toJSDate() })
      .andWhere('bp.end_at > :workStart', { workStart: workStart.toUTC().toJSDate() })
      .getMany();

    // Aktif randevuları al
    const appointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.staff_id = :staffId', { staffId: staff.id })
      .andWhere('a.status NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
      })
      .andWhere('a.start_at < :workEnd', { workEnd: workEnd.toUTC().toJSDate() })
      .andWhere('a.end_at > :workStart', { workStart: workStart.toUTC().toJSDate() })
      .getMany();

    // Slotları üret
    const slots: TimeSlot[] = [];
    let current = workStart;
    const now = DateTime.utc();

    while (current.plus({ minutes: durationMinutes }) <= workEnd) {
      const slotEnd = current.plus({ minutes: durationMinutes });
      const slotStartUtc = current.toUTC();
      const slotEndUtc = slotEnd.toUTC();

      // Tüm karşılaştırmalar UTC'de — server saati yetkili, client saatine güvenilmez
      const isPast           = slotStartUtc < now;
      const blockedConflict  = !isPast && blockedPeriods.some((bp) => {
        const bpStart = DateTime.fromJSDate(bp.start_at).toUTC();
        const bpEnd   = DateTime.fromJSDate(bp.end_at).toUTC();
        return slotStartUtc < bpEnd && slotEndUtc > bpStart;
      });
      const bookedConflict   = !isPast && !blockedConflict && appointments.some((appt) => {
        const apptStart = DateTime.fromJSDate(appt.start_at).toUTC();
        const apptEnd   = DateTime.fromJSDate(appt.end_at).toUTC();
        return slotStartUtc < apptEnd && slotEndUtc > apptStart;
      });

      const available = !isPast && !blockedConflict && !bookedConflict;
      const reason: SlotUnavailableReason | undefined = isPast
        ? 'past'
        : blockedConflict
        ? 'blocked'
        : bookedConflict
        ? 'booked'
        : undefined;

      slots.push({
        start_local: current.toFormat('HH:mm'),
        end_local: slotEnd.toFormat('HH:mm'),
        start_utc: slotStartUtc.toISO()!,
        end_utc: slotEndUtc.toISO()!,
        available,
        reason,
        staff_id: staff.id,
        staff_name: staff.full_name || undefined,
      });

      current = current.plus({ minutes: slotInterval });
    }

    return slots;
  }
}
