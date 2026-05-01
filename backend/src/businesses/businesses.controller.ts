import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsString, IsObject, MinLength, MaxLength } from 'class-validator';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../database/entities/user.entity';
import { BusinessesService } from './businesses.service';
import { PlanLimitService } from './plan-limit.service';
import { PushService } from '../notifications/push/push.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

class PushSubscribeDto {
  @IsString() endpoint: string;
  @IsObject() keys: { auth: string; p256dh: string };
}

class CreateTicketDto {
  @IsString() @MinLength(3) @MaxLength(255)
  subject: string;

  @IsString() @MinLength(10) @MaxLength(5000)
  message: string;
}

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly planLimitService: PlanLimitService,
    private readonly pushService: PushService,
    private readonly config: ConfigService,
  ) {}

  // Push bildirim VAPID public key (auth gerektirir)
  @Get('push-vapid-key')
  @UseGuards(JwtAuthGuard)
  getVapidPublicKey() {
    return { data: { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY', '') } };
  }

  // Push aboneliği kaydet + işletme için push_enabled otomatik aç
  @Post('push-subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async pushSubscribe(
    @Body() dto: PushSubscribeDto,
    @CurrentUser() user: User,
  ) {
    await this.pushService.subscribe(user.id, dto.endpoint, dto.keys);
    if (user.business_id) {
      await this.businessesService.updateNotificationSettings(user.business_id, { push_enabled: true } as any);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateBusinessDto) {
    return this.businessesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@Query() query: ListBusinessesDto) {
    return this.businessesService.findAll(query);
  }

  // Public — vitrin sayfası (JWT gerektirmez)
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businessesService.findBySlug(slug);
  }

  // Public — randevu adımı için personel listesi (sadece id + isim, JWT gerektirmez)
  @Get(':id/public-staff')
  getPublicStaff(@Param('id') id: string) {
    return this.businessesService.getPublicStaff(id);
  }

  // Public — vitrin için birleşik çalışma saatleri (JWT gerektirmez)
  @Get(':id/opening-hours')
  @Public()
  getOpeningHours(@Param('id') id: string) {
    return this.businessesService.getOpeningHours(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const targetId = (user.role === UserRole.BUSINESS_ADMIN || user.role === UserRole.STAFF) ? user.business_id! : id;
    return this.businessesService.findOne(targetId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : id;
    return this.businessesService.update(targetId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.businessesService.remove(id);
  }

  // QR kod indir
  @Get(':id/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  async getQr(
    @Param('id') id: string,
    @Query('format') format: 'png' | 'svg' = 'png',
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    const targetId = (user.role === UserRole.BUSINESS_ADMIN || user.role === UserRole.STAFF) ? user.business_id! : id;
    const result = await this.businessesService.generateQr(targetId, format);

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(result);
    } else {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="qr.png"');
      res.send(result);
    }
  }

  // Plan kullanım bilgisi
  @Get(':id/plan-usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getPlanUsage(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : id;
    return this.planLimitService.getUsageInfo(targetId);
  }

  // Bildirim ayarları
  @Get(':id/notification-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getNotificationSettings(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : id;
    return this.businessesService.getNotificationSettings(targetId);
  }

  @Patch(':id/notification-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  updateNotificationSettings(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : id;
    return this.businessesService.updateNotificationSettings(targetId, dto);
  }

  // Destek talebi oluştur
  @Post(':id/support-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createTicket(
    @Param('id') id: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : id;
    return this.businessesService.createSupportTicket(targetId, dto.subject, dto.message);
  }
}
