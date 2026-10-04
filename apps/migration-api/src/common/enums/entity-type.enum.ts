/** Every migratable entity, in dependency order (§17): parents before children. */
export type EntityType =
  | 'doctor'
  | 'patient'
  | 'appointment'
  | 'encounter'
  | 'prescription'
  | 'lab_result';

export const MIGRATION_ORDER: readonly EntityType[] = [
  'doctor',
  'patient',
  'appointment',
  'encounter',
  'prescription',
  'lab_result',
];

/** Source (= target) table name per entity. */
export const ENTITY_TABLE: Record<EntityType, string> = {
  doctor: 'doctors',
  patient: 'patients',
  appointment: 'appointments',
  encounter: 'encounters',
  prescription: 'prescriptions',
  lab_result: 'lab_results',
};

export function isEntityType(value: unknown): value is EntityType {
  return (
    typeof value === 'string' && (MIGRATION_ORDER as readonly string[]).includes(value)
  );
}
