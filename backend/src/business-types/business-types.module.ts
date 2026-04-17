import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessType } from '../database/entities/business-type.entity';
import { BusinessTypesController } from './business-types.controller';
import { BusinessTypesService } from './business-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessType])],
  controllers: [BusinessTypesController],
  providers: [BusinessTypesService],
  exports: [BusinessTypesService],
})
export class BusinessTypesModule {}
