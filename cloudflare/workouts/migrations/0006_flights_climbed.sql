ALTER TABLE activities ADD COLUMN flights_climbed REAL CHECK (flights_climbed IS NULL OR flights_climbed >= 0);
ALTER TABLE activities ADD COLUMN steps_climbed REAL CHECK (steps_climbed IS NULL OR steps_climbed >= 0);
