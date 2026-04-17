import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { Business } from '../database/entities/business.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
