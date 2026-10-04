import { Injectable } from '@nestjs/common';
import { TargetEncounter } from '../../database/target/entities/target-encounter.entity';
import { Encounter } from '../../encounters/entities/encounter.entity';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

/** Encounter transformation. FKs still hold SOURCE ids (engine translates them). */
@Injectable()
export class EncounterTransformer implements EntityTransformer<Encounter, TargetEncounter> {
  transform(source: Encounter): TargetEncounter {
    const target = new TargetEncounter();
    target.patientId = source.patientId;
    target.doctorId = source.doctorId;
    target.encounterDate = source.encounterDate;
    target.chiefComplaint = source.chiefComplaint?.trim() || null;
    target.diagnosis = source.diagnosis?.trim() || null;
    target.notes = source.notes?.trim() || null;
    return target;
  }
}
