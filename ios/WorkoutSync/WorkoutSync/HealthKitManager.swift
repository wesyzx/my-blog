import CoreLocation
import Combine
import Foundation
import HealthKit

@MainActor
final class HealthKitManager: ObservableObject {
    @Published private(set) var status = "尚未授权健康数据"
    @Published private(set) var lastSync: Date?
    @Published private(set) var syncedCount = 0

    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]
        types.insert(HKSeriesType.workoutRoute())
        for identifier in [
            HKQuantityTypeIdentifier.activeEnergyBurned,
            HKQuantityTypeIdentifier.heartRate,
            HKQuantityTypeIdentifier.runningSpeed,
            HKQuantityTypeIdentifier.stepCount,
            HKQuantityTypeIdentifier.distanceWalkingRunning,
            HKQuantityTypeIdentifier.distanceCycling,
            HKQuantityTypeIdentifier.cyclingPower
        ] {
            if let type = HKObjectType.quantityType(forIdentifier: identifier) {
                types.insert(type)
            }
        }
        return types
    }

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            status = "此设备不支持 Apple 健康数据"
            return
        }
        do {
            try await healthStore.requestAuthorization(toShare: [], read: readTypes)
            status = "健康数据权限已请求，请在系统设置中确认"
        } catch {
            status = "授权失败：\(error.localizedDescription)"
        }
    }

    func syncRecent(endpoint: URL, token: String, limit: Int = 25) async {
        guard !token.isEmpty else {
            status = "请先填写 Worker 令牌"
            return
        }
        status = "正在读取 Apple 健康数据…"
        do {
            let workouts = try await queryWorkouts(limit: limit)
            guard !workouts.isEmpty else {
                status = "没有找到运动记录"
                return
            }
            var payloads: [WorkoutPayload] = []
            for workout in workouts {
                payloads.append(try await makePayload(from: workout))
            }
            try await upload(WorkoutUpload(activities: payloads), endpoint: endpoint, token: token)
            syncedCount = payloads.count
            lastSync = Date()
            status = "已同步 \(payloads.count) 条运动记录"
        } catch {
            status = "同步失败：\(error.localizedDescription)"
        }
    }

    private func queryWorkouts(limit: Int) async throws -> [HKWorkout] {
        try await withCheckedThrowingContinuation { continuation in
            let start = calendar.date(byAdding: .year, value: -2, to: Date()) ?? .distantPast
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: predicate,
                limit: limit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: (samples as? [HKWorkout]) ?? [])
                }
            }
            healthStore.execute(query)
        }
    }

    private func makePayload(from workout: HKWorkout) async throws -> WorkoutPayload {
        let distance = workout.totalDistance?.doubleValue(for: .meter()) ?? 0
        let duration = workout.duration
        // HealthKit exposes elevation as an associated sample on some sources;
        // route altitude is handled separately when available.
        let elevation = 0.0
        let energy = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie())
        let heartRates = try await queryHeartRates(for: workout)
        let route = try await queryRoute(for: workout)
        let pace = distance > 0 && duration > 0 ? duration / (distance / 1000) : nil
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let components = calendar.dateComponents([.year, .month, .day], from: workout.startDate)
        let localDate = String(format: "%04d-%02d-%02d", components.year ?? 1970, components.month ?? 1, components.day ?? 1)

        return WorkoutPayload(
            id: workout.uuid.uuidString,
            type: activityName(workout.workoutActivityType),
            startedAt: formatter.string(from: workout.startDate),
            localDate: localDate,
            distanceMeters: distance,
            durationSeconds: duration,
            elevationGainMeters: elevation,
            pace: pace,
            activeEnergyKcal: energy,
            averageHeartRateBpm: heartRates.average,
            maxHeartRateBpm: heartRates.maximum,
            averageCadenceRpm: nil,
            route: route
        )
    }

    private func activityName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "Run"
        case .cycling: return "Ride"
        case .swimming: return "Swim"
        case .hiking: return "Hike"
        case .walking: return "Walk"
        default: return "Workout"
        }
    }

    private func queryHeartRates(for workout: HKWorkout) async throws -> (average: Double?, maximum: Double?) {
        guard let type = HKObjectType.quantityType(forIdentifier: .heartRate) else { return (nil, nil) }
        let predicate = HKQuery.predicateForSamples(withStart: workout.startDate, end: workout.endDate, options: .strictStartDate)
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: (samples as? [HKQuantitySample]) ?? []) }
            }
            healthStore.execute(query)
        }
        let values = samples.map { $0.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) }.filter { $0 > 0 }
        guard !values.isEmpty else { return (nil, nil) }
        return (values.reduce(0, +) / Double(values.count), values.max())
    }

    private func queryRoute(for workout: HKWorkout) async throws -> String? {
        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForSamples(withStart: workout.startDate.addingTimeInterval(-300), end: workout.endDate.addingTimeInterval(300), options: [])
        let routes: [HKWorkoutRoute] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: routeType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: (samples as? [HKWorkoutRoute]) ?? []) }
            }
            healthStore.execute(query)
        }
        guard let route = routes.min(by: { abs($0.startDate.timeIntervalSince(workout.startDate)) < abs($1.startDate.timeIntervalSince(workout.startDate)) }) else { return nil }
        let locations: [CLLocation] = try await withCheckedThrowingContinuation { continuation in
            var collected: [CLLocation] = []
            let query = HKWorkoutRouteQuery(route: route) { _, batch, done, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    collected.append(contentsOf: batch ?? [])
                    if done { continuation.resume(returning: collected) }
                }
            }
            healthStore.execute(query)
        }
        guard locations.count >= 2 else { return nil }
        return Polyline.encode(locations)
    }

    private func upload(_ payload: WorkoutUpload, endpoint: URL, token: String) async throws {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}

private enum Polyline {
    static func encode(_ locations: [CLLocation]) -> String {
        var output = ""
        var lastLatitude = 0
        var lastLongitude = 0
        for location in locations {
            let latitude = Int((location.coordinate.latitude * 100000).rounded())
            let longitude = Int((location.coordinate.longitude * 100000).rounded())
            output += encodeValue(latitude - lastLatitude)
            output += encodeValue(longitude - lastLongitude)
            lastLatitude = latitude
            lastLongitude = longitude
        }
        return output
    }

    private static func encodeValue(_ value: Int) -> String {
        var unsigned = value < 0 ? ~(value << 1) : value << 1
        var result = ""
        while unsigned >= 0x20 {
            result.append(Character(UnicodeScalar((0x20 | (unsigned & 0x1f)) + 63)!))
            unsigned >>= 5
        }
        result.append(Character(UnicodeScalar(unsigned + 63)!))
        return result
    }
}
