import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { AdminService } from './admin.service';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionPlan } from '../database/entities/business.entity';
import { TicketStatus } from '../database/entities/support-ticket.entity';

class UpdatePlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsString()
  subscription_ends_at?: string;
}

class UpdateTicketDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsOptional()
  @IsString()
  admin_note?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('businesses')
  getBusinesses(@Query() query: any) {
    return this.adminService.getBusinesses(query);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getPlatformStats();
  }

  @Patch('businesses/:id/plan')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(id, dto.plan, dto.subscription_ends_at);
  }

  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('support-tickets')
  getTickets(@Query() query: any) {
    return this.adminService.getTickets(query);
  }

  @Patch('support-tickets/:id')
  updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.adminService.updateTicket(id, dto.status, dto.admin_note);
  }
}
