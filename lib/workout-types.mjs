export const WORKOUT_LABELS = {
  Run: '跑步',
  Ride: '骑行',
  Swim: '游泳',
  Hike: '徒步',
  Walk: '步行',
  Stairs: '爬楼',
  Stretch: '拉伸',
  JumpRope: '跳绳',
  Workout: '训练',
}

const ALIASES = new Map([
  ['Run', ['run', 'running', 'outdoorRunning', 'outdoorRun', '户外跑步', '跑步']],
  ['Ride', ['ride', 'cycling', 'bike', 'outdoorCycling', 'outdoorCycle', '户外单车', '户外骑行', '骑行']],
  ['Swim', ['swim', 'swimming', '游泳']],
  ['Hike', ['hike', 'hiking', '徒步']],
  ['Walk', ['walk', 'walking', 'outdoorWalking', 'outdoorWalk', '户外步行', '步行']],
  ['Stairs', ['stairs', 'stairClimbing', 'stairStepper', '爬楼梯', '爬楼']],
  ['Stretch', ['stretch', 'stretching', 'cooldown', 'flexibility', '整理放松', '拉伸']],
  ['JumpRope', ['jumpRope', 'ropeJump', 'ropeJumping', 'jumpingRope', '跳绳', '跳神']],
  ['Workout', [
    'workout', 'training', 'highIntensityIntervalTraining', 'hiit',
    'functionalStrengthTraining', 'traditionalStrengthTraining', 'coreTraining',
    '高强度间歇训练', '功能性力量训练', '传统力量训练', '核心训练', '训练',
  ]],
].flatMap(([type, names]) => names.map((name) => [typeKey(name), type])))

function typeKey(value) {
  return String(value ?? '').trim().toLowerCase()
    .replace(/^hkworkoutactivitytype/, '')
    .replace(/[\s_-]+/g, '')
}

/** Long walking/hiking sessions share the user's 5 km hiking category. */
export function normalizeWorkoutType(value, distanceMeters = 0) {
  const type = ALIASES.get(typeKey(value)) ?? 'Workout'
  if (type === 'Walk' || type === 'Hike') {
    return Number(distanceMeters) >= 5000 ? 'Hike' : 'Walk'
  }
  return type
}

/** Search the complete route snapshot, independently of the latest 50 workouts. */
export function latestHikingRoute(activities) {
  return activities
    .filter((activity) => activity.route
      && normalizeWorkoutType(activity.type, activity.distanceMeters) === 'Hike')
    .reduce((latest, activity) => !latest || activity.startedAt > latest.startedAt ? activity : latest, null)
}
