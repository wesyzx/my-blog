import Foundation

struct WorkoutPayload: Encodable, Identifiable {
    let id: String
    let type: String
    let startedAt: String
    let localDate: String
    let distanceMeters: Double
    let durationSeconds: Double
    let elevationGainMeters: Double
    let pace: Double?
    let activeEnergyKcal: Double?
    let averageHeartRateBpm: Double?
    let maxHeartRateBpm: Double?
    let averageCadenceRpm: Double?
    let route: String?

    enum CodingKeys: String, CodingKey {
        case id, type, startedAt, localDate, distanceMeters, durationSeconds
        case elevationGainMeters, pace, activeEnergyKcal, averageHeartRateBpm
        case maxHeartRateBpm, averageCadenceRpm, route, publishRoute
    }

    init(
        id: String,
        type: String,
        startedAt: String,
        localDate: String,
        distanceMeters: Double,
        durationSeconds: Double,
        elevationGainMeters: Double,
        pace: Double?,
        activeEnergyKcal: Double?,
        averageHeartRateBpm: Double?,
        maxHeartRateBpm: Double?,
        averageCadenceRpm: Double?,
        route: String?
    ) {
        self.id = id
        self.type = type
        self.startedAt = startedAt
        self.localDate = localDate
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        self.elevationGainMeters = elevationGainMeters
        self.pace = pace
        self.activeEnergyKcal = activeEnergyKcal
        self.averageHeartRateBpm = averageHeartRateBpm
        self.maxHeartRateBpm = maxHeartRateBpm
        self.averageCadenceRpm = averageCadenceRpm
        self.route = route
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(type, forKey: .type)
        try container.encode(startedAt, forKey: .startedAt)
        try container.encode(localDate, forKey: .localDate)
        try container.encode(distanceMeters, forKey: .distanceMeters)
        try container.encode(durationSeconds, forKey: .durationSeconds)
        try container.encode(elevationGainMeters, forKey: .elevationGainMeters)
        try container.encodeIfPresent(pace, forKey: .pace)
        try container.encodeIfPresent(activeEnergyKcal, forKey: .activeEnergyKcal)
        try container.encodeIfPresent(averageHeartRateBpm, forKey: .averageHeartRateBpm)
        try container.encodeIfPresent(maxHeartRateBpm, forKey: .maxHeartRateBpm)
        try container.encodeIfPresent(averageCadenceRpm, forKey: .averageCadenceRpm)
        if let route {
            try container.encode(true, forKey: .publishRoute)
            try container.encode(route, forKey: .route)
        }
    }
}

struct WorkoutUpload: Encodable {
    let source = "apple-health"
    let activities: [WorkoutPayload]
}
