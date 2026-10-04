import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { Patient } from './entities/patient.entity';
import { PatientsController } from './patients.controller';
import { PatientExtractorService } from './services/patient-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient], SOURCE_DATA_SOURCE_NAME)],
  controllers: [PatientsController],
  providers: [PatientExtractorService],
  // Exported for the Phase-5 migration engine, which reuses the extractor
  // instead of reimplementing batch reads.
  exports: [PatientExtractorService],
})
export class PatientsModule {}
