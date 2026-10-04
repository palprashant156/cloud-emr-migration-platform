import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { Encounter } from './entities/encounter.entity';
import { EncounterExtractorService } from './services/encounter-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Encounter], SOURCE_DATA_SOURCE_NAME)],
  providers: [EncounterExtractorService],
  exports: [EncounterExtractorService],
})
export class EncountersModule {}
