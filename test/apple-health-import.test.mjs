import { execFileSync } from 'node:child_process'
import test from 'node:test'

test('imports workout elevation metadata and active energy without inventing missing measurements', () => {
  execFileSync('python3', ['-c', `
import importlib.util
import io
import sys
import zipfile

spec = importlib.util.spec_from_file_location("apple_health_import", "scripts/import-apple-health.py")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

xml = """<HealthData>
<Workout uuid="stairs" workoutActivityType="HKWorkoutActivityTypeStairClimbing"
 startDate="2026-10-14 07:03:59 +0800" duration="38" durationUnit="min">
 <MetadataEntry key="HKElevationAscended" value="420&#32;ft"/>
 <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="1046" unit="kJ"/>
</Workout>
<Workout uuid="missing" startDate="2026-10-15 07:00:00 +0800" totalEnergyBurned="300" totalEnergyBurnedUnit="kcal"/>
<Workout uuid="zero" startDate="2026-10-16 07:00:00 +0800">
 <MetadataEntry key="HKElevationAscended" value="0 m"/>
 <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="0" unit="kcal"/>
</Workout>
<Workout uuid="invalid" startDate="2026-10-17 07:00:00 +0800">
 <MetadataEntry key="HKElevationAscended" value="-20 m"/>
 <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="NaN" unit="kcal"/>
</Workout>
<Workout uuid="unknown-unit" startDate="2026-10-18 07:00:00 +0800">
 <MetadataEntry key="HKElevationAscended" value="50 flights"/>
 <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="100" unit="unknown"/>
</Workout>
<Workout uuid="legacy" startDate="2026-10-19 07:00:00 +0800"
 totalElevationAscended="0.12" totalElevationAscendedUnit="km"/>
</HealthData>"""
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w") as archive:
    archive.writestr("apple_health_export/export.xml", xml)
with zipfile.ZipFile(buffer) as archive:
    workouts = module.parse_workouts(archive)
activities = {a["id"]: a for a in module.build_activities(workouts, {})}
assert activities["stairs"]["elevationGainMeters"] == 128.016
assert activities["stairs"]["activeEnergyKcal"] == 250
assert activities["stairs"]["durationSeconds"] == 2280
assert activities["stairs"]["localDate"] == "2026-10-14"
assert activities["legacy"]["elevationGainMeters"] == 120
for key in ["missing", "invalid", "unknown-unit"]:
    assert "elevationGainMeters" not in activities[key]
    assert "activeEnergyKcal" not in activities[key]
assert activities["zero"]["elevationGainMeters"] == 0
assert activities["zero"]["activeEnergyKcal"] == 0

route = module.Route("stairs.gpx", [(30, 120, 10, None), (30, 120, 40, None)])
filled = module.build_activities(workouts, {"missing": route, "zero": route})
by_id = {a["id"]: a for a in filled}
assert by_id["missing"]["elevationGainMeters"] == 30
assert by_id["zero"]["elevationGainMeters"] == 0
`], { cwd: new URL('..', import.meta.url), stdio: 'pipe' })
})
