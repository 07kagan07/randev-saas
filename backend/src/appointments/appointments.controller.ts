import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../database/entities/user.entity';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { AppointmentActionDto } from './dto/appointment-action.dto';
import { RejectAppointmentDto } from './dto/reject-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Public — 5 istek/dakika/IP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  findAll(@CurrentUser() user: User, @Query() query: ListAppointmentsDto) {
    return this.appointmentsService.findAll(user, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.STAFF)
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.findOne(user, id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  approve(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.approve(user, id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  reject(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RejectAppointmentDto,
  ) {
    return this.appointmentsService.reject(user, id, dto.reason);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.BUSINESS_ADMIN)
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.complete(user, id);
  }

  @Patch(':id/no-show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.BUSINESS_ADMIN)
  noShow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.markNoShow(user, id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.BUSINESS_ADMIN)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.cancelByStaff(user, id);
  }

  // Public — token ile randevu bilgisi getir
  @Get('action')
  getByToken(@Query('token') token: string) {
    return this.appointmentsService.getByToken(token);
  }

  // Public — token ile iptal/ertele
  @Post('action')
  @HttpCode(HttpStatus.OK)
  action(@Body() dto: AppointmentActionDto) {
    return this.appointmentsService.handleAction(dto);
  }
}
