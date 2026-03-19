import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Business } from '../database/entities/business.entity';
import { User } from '../database/entities/user.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { SupportTicket } from '../database/entities/support-ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business, User, Appointment, SupportTicket])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
