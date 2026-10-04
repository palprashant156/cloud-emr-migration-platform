import { Injectable } from '@nestjs/common';
import { TargetLabResult } from '../../database/target/entities/target-lab-result.entity';
import { LabResult } from '../../lab-results/entities/lab-result.entity';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

/** Lab-result transformation. FKs still hold SOURCE ids (engine translates them). */
@Injectable()
export class LabResultTransformer implements EntityTransformer<LabResult, TargetLabResult> {
  transform(source: LabResult): TargetLabResult {
    const target = new TargetLabResult();
    target.patientId = source.patientId;
    target.encounterId = source.encounterId;
    target.testName = source.testName.trim();
    target.testValue = source.testValue?.trim() || null;
    target.unit = source.unit?.trim() || null;
    target.referenceRange = source.referenceRange?.trim() || null;
    target.resultDate = source.resultDate;
    return target;
  }
}
