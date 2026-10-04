import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionExtractorService } from './services/prescription-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription], SOURCE_DATA_SOURCE_NAME)],
  providers: [PrescriptionExtractorService],
  exports: [PrescriptionExtractorService],
})
export class PrescriptionsModule {}
