//
//  ContentView.swift
//  WorkoutSync
//
//  Created by 罐头周 on 2026/9/17.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var healthKit = HealthKitManager()
    @AppStorage("workerEndpoint") private var workerEndpoint = "https://workouts.wesyzx.workers.dev/internal/healthkit"
    @AppStorage("workerToken") private var workerToken = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("连接") {
                    TextField("Worker 接口", text: $workerEndpoint)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("INGEST_TOKEN", text: $workerToken)
                    Text("令牌只保存在本机，用于上传到你的 Cloudflare Worker。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("健康数据") {
                    Button("授权 Apple 健康数据") {
                        Task { await healthKit.requestAuthorization() }
                    }
                    Button("同步最近 25 条运动") {
                        guard let endpoint = URL(string: workerEndpoint) else { return }
                        Task { await healthKit.syncRecent(endpoint: endpoint, token: workerToken) }
                    }
                    .disabled(workerToken.isEmpty)
                }

                Section("状态") {
                    Label(healthKit.status, systemImage: "info.circle")
                    if let lastSync = healthKit.lastSync {
                        Text("最近同步：\(lastSync.formatted(date: .abbreviated, time: .shortened))")
                    }
                    if healthKit.syncedCount > 0 {
                        Text("本次同步：\(healthKit.syncedCount) 条")
                    }
                }
            }
            .navigationTitle("WorkoutSync")
        }
    }
}
