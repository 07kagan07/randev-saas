import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType, BookingFormField } from '../database/entities/business-type.entity';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto';
import { UpdateBusinessTypeDto } from './dto/update-business-type.dto';

@Injectable()
export class BusinessTypesService {
  constructor(
    @InjectRepository(BusinessType)
    private readonly repo: Repository<BusinessType>,
  ) {}

  findAll(activeOnly = false): Promise<BusinessType[]> {
    return this.repo.find({
      where: activeOnly ? { is_active: true } : {},
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<BusinessType> {
    const bt = await this.repo.findOne({ where: { id } });
    if (!bt) throw new NotFoundException({ code: 'BUSINESS_TYPE_NOT_FOUND', message: 'İşletme tipi bulunamadı.' });
    return bt;
  }

  async create(dto: CreateBusinessTypeDto): Promise<BusinessType> {
    const entity = new BusinessType();
    entity.name = dto.name;
    entity.icon = dto.icon ?? null;
    entity.template_services = dto.template_services ?? [];
    entity.booking_form_fields = (dto.booking_form_fields ?? []) as BookingFormField[];
    entity.is_active = dto.is_active ?? true;
    entity.sort_order = dto.sort_order ?? 0;
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateBusinessTypeDto): Promise<BusinessType> {
    const bt = await this.findOne(id);
    if (dto.name !== undefined) bt.name = dto.name;
    if (dto.icon !== undefined) bt.icon = dto.icon ?? null;
    if (dto.template_services !== undefined) bt.template_services = dto.template_services;
    if (dto.booking_form_fields !== undefined) bt.booking_form_fields = dto.booking_form_fields as BookingFormField[];
    if (dto.is_active !== undefined) bt.is_active = dto.is_active;
    if (dto.sort_order !== undefined) bt.sort_order = dto.sort_order;
    return this.repo.save(bt);
  }

  async remove(id: string): Promise<void> {
    const bt = await this.findOne(id);
    await this.repo.remove(bt);
  }
}
