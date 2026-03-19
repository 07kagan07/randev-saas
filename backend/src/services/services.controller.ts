import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../database/entities/user.entity';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('businesses/:businessId/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.servicesService.create(targetId, dto);
  }

  // Public endpoint — vitrin sayfası için
  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @Query('public') isPublic?: string,
  ) {
    return this.servicesService.findAll(businessId, isPublic === 'true');
  }

  @Patch(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  update(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.servicesService.update(targetId, serviceId, dto);
  }

  @Delete(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser() user: User,
  ) {
    const targetId = user.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.servicesService.remove(targetId, serviceId);
  }
}
