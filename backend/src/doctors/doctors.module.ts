import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { Doctor } from './entities/doctor.entity';
import { DoctorExtractorService } from './services/doctor-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor], SOURCE_DATA_SOURCE_NAME)],
  providers: [DoctorExtractorService],
  exports: [DoctorExtractorService],
})
export class DoctorsModule {}
