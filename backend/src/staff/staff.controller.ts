import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../database/entities/user.entity';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SetWorkingHoursDto } from './dto/set-working-hours.dto';
import { CreateBlockedPeriodDto } from './dto/create-blocked-period.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) { }

  // ─── Personel CRUD (/businesses/:id/staff) ──────────────────────────────

  @Post('businesses/:businessId/staff')
  @Roles(UserRole.BUSINESS_ADMIN)
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    if (!targetId) throw new ForbiddenException('Business context required.');
    return this.staffService.create(targetId, dto);
  }

  @Get('businesses/:businessId/staff')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    if (!targetId) throw new ForbiddenException('Business context required.');
    return this.staffService.findAll(targetId);
  }

  @Get('businesses/:businessId/staff/:staffId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF, UserRole.SUPER_ADMIN)
  findOne(
    @Param('businessId') businessId: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    const targetStaffId = user.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.findOne(targetId, targetStaffId);
  }

  @Patch('businesses/:businessId/staff/:staffId')
  @Roles(UserRole.BUSINESS_ADMIN)
  update(
    @Param('businessId') businessId: string,
    @Param('staffId') staffId: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.staffService.update(targetId, staffId, dto);
  }

  @Delete('businesses/:businessId/staff/:staffId')
  @Roles(UserRole.BUSINESS_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('businessId') businessId: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.staffService.remove(targetId, staffId);
  }

  // ─── Çalışma Saatleri (/staff/:staffId/working-hours) ────────────────────

  @Get('staff/:staffId/working-hours')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF, UserRole.SUPER_ADMIN)
  getWorkingHours(@Param('staffId') staffId: string, @CurrentUser() user: User) {
    const id = user.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.getWorkingHours(id);
  }

  @Patch('staff/:staffId/working-hours')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  setWorkingHours(
    @Param('staffId') staffId: string,
    @Body() dto: SetWorkingHoursDto,
    @CurrentUser() user: User,
  ) {
    const id = user.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.setWorkingHours(id, dto);
  }

  // ─── Geçici Kapatma (/staff/:staffId/blocked-periods) ────────────────────

  @Post('staff/:staffId/blocked-periods')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  createBlockedPeriod(
    @Param('staffId') staffId: string,
    @Body() dto: CreateBlockedPeriodDto,
    @CurrentUser() user: User,
  ) {
    const id = user.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.createBlockedPeriod(id, user.business_id!, user.id, dto);
  }

  @Get('staff/:staffId/blocked-periods')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  getBlockedPeriods(
    @Param('staffId') staffId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: User,
  ) {
    const id = user?.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.getBlockedPeriods(id, from, to);
  }

  @Delete('staff/:staffId/blocked-periods/:periodId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBlockedPeriod(
    @Param('staffId') staffId: string,
    @Param('periodId') periodId: string,
    @CurrentUser() user: User,
  ) {
    const id = user.role === UserRole.STAFF ? user.id : staffId;
    return this.staffService.removeBlockedPeriod(id, periodId);
  }
}
