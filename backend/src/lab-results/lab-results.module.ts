import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { LabResult } from './entities/lab-result.entity';
import { LabResultExtractorService } from './services/lab-result-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([LabResult], SOURCE_DATA_SOURCE_NAME)],
  providers: [LabResultExtractorService],
  exports: [LabResultExtractorService],
})
export class LabResultsModule {}
