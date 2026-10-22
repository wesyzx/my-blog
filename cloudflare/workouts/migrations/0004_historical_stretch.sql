-- Classification confirmed by the owner; preserve every recorded measurement.
UPDATE activities
SET type = 'Stretch', source_type = 'Stretch'
WHERE source = 'apple-health'
  AND type IN ('Workout', 'Stretch')
  AND (
    (id = 'apple-health:8A47CD5D-3174-4EB3-B8DC-FB753DEE5E1B'
      AND started_at = '2026-03-24T08:33:53.451Z')
    OR
    (id = 'apple-health:74F7CDF2-2FA9-41EB-B70F-B625F973B9E0'
      AND started_at = '2026-03-23T02:09:19.931Z')
  );
