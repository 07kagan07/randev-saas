import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Service } from '../database/entities/service.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { PlanLimitService } from '../businesses/plan-limit.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepo: Repository<StaffServiceEntity>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async create(businessId: string, dto: CreateServiceDto): Promise<Service> {
    await this.planLimitService.checkServiceLimit(businessId);

    const service = this.serviceRepo.create({ ...dto, business_id: businessId });
    const saved = await this.serviceRepo.save(service);

    if (dto.staff_ids?.length) {
      await this.staffServiceRepo.save(
        dto.staff_ids.map((staffId) => ({
          staff_id: staffId,
          service_id: saved.id,
        })),
      );
    }

    return this.findOne(businessId, saved.id);
  }

  async findAll(businessId: string, publicView = false): Promise<Service[]> {
    const services = await this.serviceRepo.find({
      where: { business_id: businessId, is_active: true },
      relations: ['staff_services', 'staff_services.staff'],
      order: { name: 'ASC' },
    });

    if (publicView) {
      return services.map((s) => ({
        ...s,
        price: s.show_price ? s.price : null,
      })) as Service[];
    }

    return services;
  }

  async findOne(businessId: string, serviceId: string): Promise<Service> {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, business_id: businessId },
      relations: ['staff_services', 'staff_services.staff'],
    });
    if (!service) {
      throw new NotFoundException({
        code: 'SERVICE_NOT_FOUND',
        message: 'Hizmet bulunamadı.',
        message_en: 'Service not found.',
      });
    }
    return service;
  }

  async update(businessId: string, serviceId: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(businessId, serviceId);

    const { staff_ids, ...rest } = dto;
    Object.assign(service, rest);
    await this.serviceRepo.save(service);

    if (staff_ids !== undefined) {
      await this.staffServiceRepo.delete({ service_id: serviceId });
      if (staff_ids.length > 0) {
        await this.staffServiceRepo.save(
          staff_ids.map((staffId) => ({ staff_id: staffId, service_id: serviceId })),
        );
      }
    }

    return this.findOne(businessId, serviceId);
  }

  async remove(businessId: string, serviceId: string): Promise<void> {
    const service = await this.findOne(businessId, serviceId);

    const activeAppts = await this.appointmentRepo.count({
      where: {
        service_id: serviceId,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
      },
    });

    if (activeAppts > 0) {
      throw new BadRequestException({
        code: 'SERVICE_HAS_APPOINTMENTS',
        message: `Bu hizmetin ${activeAppts} aktif randevusu var. Önce randevuları iptal edin.`,
        message_en: `This service has ${activeAppts} active appointments. Please cancel them first.`,
      });
    }

    await this.serviceRepo.remove(service);
  }
}
