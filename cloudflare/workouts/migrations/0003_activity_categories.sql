-- Preserve the incoming Apple type so future display rules remain reversible.
ALTER TABLE activities ADD COLUMN source_type TEXT;
UPDATE activities SET source_type = type WHERE source_type IS NULL;

-- Reclassify historical walking/hiking records without touching their metrics.
UPDATE activities
SET type = CASE WHEN distance_meters >= 5000 THEN 'Hike' ELSE 'Walk' END
WHERE type IN ('Walk', 'Hike');
