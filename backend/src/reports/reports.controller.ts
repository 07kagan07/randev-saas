import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../database/entities/user.entity';
import { ReportsService } from './reports.service';

@Controller('businesses/:businessId/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  getOverview(
    @Param('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: User,
  ) {
    const targetId = user?.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.reportsService.getOverview(targetId, from, to);
  }

  @Get('heatmap')
  getHeatmap(
    @Param('businessId') businessId: string,
    @CurrentUser() user?: User,
  ) {
    const targetId = user?.role === UserRole.BUSINESS_ADMIN ? user.business_id! : businessId;
    return this.reportsService.getHeatmap(targetId);
  }
}
