ALTER TABLE activities ADD COLUMN active_energy_kcal REAL CHECK (active_energy_kcal IS NULL OR active_energy_kcal >= 0);
ALTER TABLE activities ADD COLUMN average_heart_rate_bpm REAL CHECK (average_heart_rate_bpm IS NULL OR average_heart_rate_bpm >= 0);
ALTER TABLE activities ADD COLUMN max_heart_rate_bpm REAL CHECK (max_heart_rate_bpm IS NULL OR max_heart_rate_bpm >= 0);
ALTER TABLE activities ADD COLUMN average_cadence_rpm REAL CHECK (average_cadence_rpm IS NULL OR average_cadence_rpm >= 0);
