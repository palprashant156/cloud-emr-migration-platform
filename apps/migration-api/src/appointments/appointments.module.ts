import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { Appointment } from './entities/appointment.entity';
import { AppointmentExtractorService } from './services/appointment-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment], SOURCE_DATA_SOURCE_NAME)],
  providers: [AppointmentExtractorService],
  exports: [AppointmentExtractorService],
})
export class AppointmentsModule {}
