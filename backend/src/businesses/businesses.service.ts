import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Business } from '../database/entities/business.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { SupportTicket } from '../database/entities/support-ticket.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { slugify } from '../common/utils/slugify';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(NotificationSettings)
    private readonly notifSettingsRepo: Repository<NotificationSettings>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateBusinessDto): Promise<Business> {
    const slug = await this.generateUniqueSlug(dto.name, dto.slug);

    const business = this.businessRepo.create({
      ...dto,
      slug,
    });
    const saved = await this.businessRepo.save(business);

    // Varsayılan bildirim ayarlarını oluştur
    await this.notifSettingsRepo.save(
      this.notifSettingsRepo.create({ business_id: saved.id }),
    );

    return saved;
  }

  async findAll(query: ListBusinessesDto) {
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

    return {
      data: items,
      meta: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({ where: { id } });
    if (!business) {
      throw new NotFoundException({
        code: 'BUSINESS_NOT_FOUND',
        message: 'İşletme bulunamadı.',
        message_en: 'Business not found.',
      });
    }
    return business;
  }

  async findBySlug(slug: string): Promise<Business & { services?: any[] }> {
    const business = await this.businessRepo.findOne({
      where: { slug, is_active: true },
      relations: ['services', 'users'],
    });
    if (!business) {
      throw new NotFoundException({
        code: 'BUSINESS_NOT_FOUND',
        message: 'İşletme bulunamadı.',
        message_en: 'Business not found.',
      });
    }
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto): Promise<Business> {
    const business = await this.findOne(id);

    if (dto.slug && dto.slug !== business.slug) {
      const exists = await this.businessRepo.findOne({ where: { slug: dto.slug } });
      if (exists) {
        throw new ConflictException({
          code: 'SLUG_TAKEN',
          message: 'Bu URL adresi zaten kullanımda.',
          message_en: 'This URL slug is already taken.',
        });
      }
    }

    Object.assign(business, dto);
    return this.businessRepo.save(business);
  }

  async remove(id: string): Promise<void> {
    const business = await this.findOne(id);
    await this.businessRepo.remove(business);
  }

  async generateQr(
    id: string,
    format: 'png' | 'svg' = 'png',
  ): Promise<Buffer | string> {
    const business = await this.findOne(id);
    const url = `${this.config.get('APP_URL')}/${business.slug}`;

    if (format === 'svg') {
      return QRCode.toString(url, { type: 'svg' });
    }
    return QRCode.toBuffer(url, { type: 'png', width: 300 });
  }

  async getNotificationSettings(businessId: string): Promise<NotificationSettings> {
    const settings = await this.notifSettingsRepo.findOne({
      where: { business_id: businessId },
    });
    if (!settings) {
      // Otomatik oluştur
      return this.notifSettingsRepo.save(
        this.notifSettingsRepo.create({ business_id: businessId }),
      );
    }
    return settings;
  }

  async updateNotificationSettings(
    businessId: string,
    dto: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const settings = await this.getNotificationSettings(businessId);
    Object.assign(settings, dto);
    return this.notifSettingsRepo.save(settings);
  }

  async createSupportTicket(businessId: string, subject: string, message: string): Promise<SupportTicket> {
    const ticket = this.ticketRepo.create({ business_id: businessId, subject, message });
    return this.ticketRepo.save(ticket);
  }

  private async generateUniqueSlug(name: string, customSlug?: string): Promise<string> {
    let base = customSlug || slugify(name);
    let slug = base;
    let counter = 1;

    while (await this.businessRepo.findOne({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

}
