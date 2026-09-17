#!/usr/bin/env python3
"""Import Apple Health export workouts and GPX routes into the workouts Worker.

The export archive is parsed locally.  It is never uploaded as a whole; only
normalized workout records (and explicitly matched routes) are sent to the
Worker's authenticated ingest endpoint.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from typing import Iterable


TYPE_ALIASES = {
    "hkworkoutactivitytyperunning": "Run",
    "hkworkoutactivitytypecycling": "Ride",
    "hkworkoutactivitytypeswimming": "Swim",
    "hkworkoutactivitytypehiking": "Hike",
    "hkworkoutactivitytypewalking": "Walk",
    "running": "Run",
    "cycling": "Ride",
    "swimming": "Swim",
    "hiking": "Hike",
    "walking": "Walk",
}


@dataclass
class Workout:
    identifier: str
    activity_type: str
    started_at: dt.datetime
    local_date: str
    duration_seconds: float
    distance_meters: float
    elevation_gain_meters: float


@dataclass
class Route:
    name: str
    points: list[tuple[float, float, float | None, dt.datetime | None]]

    @property
    def started_at(self) -> dt.datetime | None:
        return next((point[3] for point in self.points if point[3]), None)

    @property
    def date_hint(self) -> str | None:
        match = re.search(r"(20\d{2})[-_](\d{1,2})[-_](\d{1,2})", self.name)
        if not match:
            return None
        return f"{int(match.group(1)):04d}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"


def parse_date(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    text = value.strip()
    # Apple Health XML uses "2026-09-17 06:30:00 +0800".
    if re.search(r" [+-]\d{4}$", text):
        try:
            return dt.datetime.strptime(text, "%Y-%m-%d %H:%M:%S %z").astimezone(dt.timezone.utc)
        except ValueError:
            pass
    try:
        normalized = text.replace("Z", "+00:00")
        parsed = dt.datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except ValueError:
        return None


def iso_date(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).date().isoformat()


def number(value: str | None, default: float = 0.0) -> float:
    try:
        parsed = float(value or default)
        return parsed if math.isfinite(parsed) and parsed >= 0 else default
    except (TypeError, ValueError):
        return default


def convert_distance(value: str | None, unit: str | None) -> float:
    factors = {"m": 1, "meter": 1, "meters": 1, "km": 1000, "mi": 1609.344, "mile": 1609.344, "miles": 1609.344, "yd": 0.9144, "ft": 0.3048}
    return number(value) * factors.get((unit or "m").lower(), 1)


def convert_duration(value: str | None, unit: str | None) -> float:
    factors = {"s": 1, "sec": 1, "second": 1, "seconds": 1, "min": 60, "minute": 60, "minutes": 60, "h": 3600, "hr": 3600, "hour": 3600, "hours": 3600}
    return number(value) * factors.get((unit or "s").lower(), 1)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_workouts(archive: zipfile.ZipFile) -> list[Workout]:
    export_name = next((name for name in archive.namelist() if name.lower().endswith("export.xml")), None)
    if not export_name:
        raise ValueError("Apple Health ZIP 中没有找到 export.xml")
    workouts: list[Workout] = []
    with archive.open(export_name) as stream:
        for _event, element in ET.iterparse(stream, events=("end",)):
            if local_name(element.tag) != "Workout":
                continue
            attrs = element.attrib
            started = parse_date(attrs.get("startDate"))
            if not started:
                element.clear()
                continue
            raw_type = (attrs.get("workoutActivityType") or "workout").lower().replace(" ", "")
            activity_type = TYPE_ALIASES.get(raw_type, "Workout")
            identifier = attrs.get("uuid") or attrs.get("id")
            if not identifier:
                fingerprint = f"{raw_type}|{attrs.get('startDate')}|{attrs.get('endDate')}"
                identifier = "workout-" + hashlib.sha1(fingerprint.encode()).hexdigest()[:20]
            workouts.append(Workout(
                identifier=identifier,
                activity_type=activity_type,
                started_at=started,
                local_date=(attrs.get("startDate", "")[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", attrs.get("startDate", "")) else iso_date(started)),
                duration_seconds=convert_duration(attrs.get("duration"), attrs.get("durationUnit")),
                distance_meters=convert_distance(attrs.get("totalDistance"), attrs.get("totalDistanceUnit")),
                elevation_gain_meters=convert_distance(attrs.get("totalElevationAscended"), attrs.get("totalElevationAscendedUnit")),
            ))
            element.clear()
    return workouts


def parse_route(name: str, raw: bytes) -> Route:
    root = ET.fromstring(raw)
    points: list[tuple[float, float, float | None, dt.datetime | None]] = []
    for element in root.iter():
        if local_name(element.tag) != "trkpt":
            continue
        try:
            lat = float(element.attrib["lat"])
            lon = float(element.attrib["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        elevation = None
        timestamp = None
        for child in element:
            if local_name(child.tag) == "ele":
                elevation = number(child.text, 0)
            elif local_name(child.tag) == "time":
                timestamp = parse_date(child.text)
        points.append((lat, lon, elevation, timestamp))
    return Route(name=name, points=points)


def encode_polyline(points: Iterable[tuple[float, float, float | None, dt.datetime | None]]) -> str:
    last_lat = 0
    last_lon = 0
    output: list[str] = []
    for lat, lon, _elevation, _timestamp in points:
        scaled_lat = int(round(lat * 100000))
        scaled_lon = int(round(lon * 100000))
        for value in (scaled_lat - last_lat, scaled_lon - last_lon):
            shifted = ~(value << 1) if value < 0 else value << 1
            while shifted >= 0x20:
                output.append(chr((0x20 | (shifted & 0x1F)) + 63))
                shifted >>= 5
            output.append(chr(shifted + 63))
        last_lat = scaled_lat
        last_lon = scaled_lon
    return "".join(output)


def route_elevation_gain(route: Route) -> float:
    gain = 0.0
    previous = None
    for _lat, _lon, elevation, _time in route.points:
        if elevation is not None and previous is not None and elevation > previous:
            gain += elevation - previous
        if elevation is not None:
            previous = elevation
    return gain


def match_routes(workouts: list[Workout], routes: list[Route], tolerance_seconds: int) -> dict[str, Route]:
    matches: dict[str, Route] = {}
    unused = set(range(len(routes)))
    for workout in sorted(workouts, key=lambda item: item.started_at):
        candidates = []
        for index in unused:
            route = routes[index]
            if not route.points:
                continue
            route_date = route.started_at.date().isoformat() if route.started_at else route.date_hint
            if route_date and route_date not in {workout.local_date, iso_date(workout.started_at)}:
                continue
            difference = abs((route.started_at - workout.started_at).total_seconds()) if route.started_at else 0
            if difference <= tolerance_seconds:
                candidates.append((difference, index))
        if candidates:
            _difference, index = min(candidates)
            matches[workout.identifier] = routes[index]
            unused.remove(index)
    return matches


def build_activities(workouts: list[Workout], routes: dict[str, Route]) -> list[dict]:
    activities = []
    for workout in workouts:
        route = routes.get(workout.identifier)
        activity = {
            "id": workout.identifier,
            "type": workout.activity_type,
            "startedAt": workout.started_at.isoformat().replace("+00:00", "Z"),
            "localDate": workout.local_date,
            "distanceMeters": round(workout.distance_meters, 3),
            "durationSeconds": round(workout.duration_seconds, 3),
            "elevationGainMeters": round(workout.elevation_gain_meters, 3),
        }
        if route:
            activity["publishRoute"] = True
            activity["route"] = encode_polyline(route.points)
            if not activity["elevationGainMeters"]:
                activity["elevationGainMeters"] = round(route_elevation_gain(route), 3)
        activities.append(activity)
    return activities


def send(endpoint: str, token: str, activities: list[dict], dry_run: bool) -> None:
    payload = json.dumps({"source": "apple-health", "activities": activities}, ensure_ascii=False).encode()
    if dry_run:
        route_count = sum(1 for activity in activities if "route" in activity)
        print(f"dry-run: {len(activities)} 条活动，{route_count} 条含路线，载荷 {len(payload)} bytes")
        return
    request = urllib.request.Request(endpoint, data=payload, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Worker 返回 HTTP {error.code}: {detail[:400]}") from error
    print(f"已导入 {result.get('ingested', len(activities))} 条，快照更新时间：{result.get('lastUpdated', 'unknown')}")


def main() -> int:
    parser = argparse.ArgumentParser(description="导入 Apple Health 导出 ZIP 到运动 Worker")
    parser.add_argument("archive", help="Apple Health 导出的 ZIP 文件")
    parser.add_argument("--endpoint", default=os.environ.get("WORKOUTS_INGEST_URL"), help="Worker /internal/healthkit 地址")
    parser.add_argument("--token", default=os.environ.get("INGEST_TOKEN"), help="Worker 令牌；也可用 INGEST_TOKEN 环境变量")
    parser.add_argument("--batch-size", type=int, default=100, help="每批活动数量，默认 100")
    parser.add_argument("--route-tolerance-minutes", type=int, default=90, help="路线与活动开始时间最大差值，默认 90 分钟")
    parser.add_argument("--dry-run", action="store_true", help="只解析并统计，不上传")
    args = parser.parse_args()
    if not args.endpoint and not args.dry_run:
        parser.error("请提供 --endpoint 或设置 WORKOUTS_INGEST_URL")
    if not args.token and not args.dry_run:
        parser.error("请提供 --token 或设置 INGEST_TOKEN")
    if args.batch_size < 1 or args.batch_size > 500:
        parser.error("--batch-size 必须在 1 到 500 之间")

    with zipfile.ZipFile(args.archive) as archive:
        workouts = parse_workouts(archive)
        route_names = [name for name in archive.namelist() if name.lower().endswith(".gpx") and "workout-routes" in name.lower()]
        routes = [parse_route(name, archive.read(name)) for name in route_names]
    matches = match_routes(workouts, routes, max(1, args.route_tolerance_minutes) * 60)
    activities = build_activities(workouts, matches)
    print(f"解析完成：{len(workouts)} 条活动，{len(matches)} 条匹配路线，{len(routes)} 个 GPX 文件")
    for start in range(0, len(activities), args.batch_size):
        send(args.endpoint, args.token or "", activities[start:start + args.batch_size], args.dry_run)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"导入失败：{error}", file=sys.stderr)
        raise SystemExit(1)
