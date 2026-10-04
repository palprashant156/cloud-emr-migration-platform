# EMR Source → AWS Target Data Mapping

## 1. Patients

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| patient_id | patient_id | ID mapping | Yes |
| first_name | first_name | Trim whitespace | Yes |
| last_name | last_name | Trim whitespace | Yes |
| date_of_birth | date_of_birth | No change | Yes |
| gender | gender | Normalize value | No |
| phone | phone | Normalize phone format | No |
| email | email | Validate email | No |
| address | address | Trim whitespace | No |
| created_at | created_at | Preserve timestamp | Yes |
| updated_at | updated_at | Preserve timestamp | Yes |

## 2. Doctors

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| doctor_id | doctor_id | ID mapping | Yes |
| first_name | first_name | Trim whitespace | Yes |
| last_name | last_name | Trim whitespace | Yes |
| specialization | specialization | Normalize value | No |
| license_number | license_number | Preserve | Yes |
| created_at | created_at | Preserve timestamp | Yes |

## 3. Appointments

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| appointment_id | appointment_id | ID mapping | Yes |
| patient_id | patient_id | Patient ID mapping | Yes |
| doctor_id | doctor_id | Doctor ID mapping | Yes |
| appointment_date | appointment_date | Preserve timestamp | Yes |
| status | status | Normalize status | Yes |

## 4. Encounters

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| encounter_id | encounter_id | ID mapping | Yes |
| patient_id | patient_id | Patient ID mapping | Yes |
| doctor_id | doctor_id | Doctor ID mapping | Yes |
| encounter_date | encounter_date | Preserve timestamp | Yes |
| chief_complaint | chief_complaint | Trim whitespace | No |
| diagnosis | diagnosis | Trim whitespace | No |
| notes | notes | Preserve | No |

## 5. Prescriptions

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| prescription_id | prescription_id | ID mapping | Yes |
| patient_id | patient_id | Patient ID mapping | Yes |
| doctor_id | doctor_id | Doctor ID mapping | Yes |
| medicine_name | medicine_name | Trim whitespace | Yes |
| dosage | dosage | Normalize | No |
| frequency | frequency | Normalize | No |
| start_date | start_date | Preserve | No |
| end_date | end_date | Preserve | No |

## 6. Lab Results

| Source Column | Target Column | Transformation | Required |
|---|---|---|---|
| lab_result_id | lab_result_id | ID mapping | Yes |
| patient_id | patient_id | Patient ID mapping | Yes |
| encounter_id | encounter_id | Encounter ID mapping | No |
| test_name | test_name | Trim whitespace | Yes |
| test_value | test_value | Preserve | No |
| unit | unit | Normalize | No |
| reference_range | reference_range | Preserve | No |
| result_date | result_date | Preserve timestamp | No |