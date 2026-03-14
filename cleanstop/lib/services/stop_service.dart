import 'dart:math';
import 'package:flutter/services.dart' show rootBundle;
import '../models/bus_stop.dart';

class StopService {
  List<BusStop>? _stops;

  /// Load and parse all stops from assets/data.txt.
  Future<List<BusStop>> loadStops() async {
    if (_stops != null) return _stops!;

    final raw = await rootBundle.loadString('assets/data.txt');
    final lines = raw
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();

    // Skip header row
    _stops = lines.skip(1).map((line) => BusStop.fromCsvRow(line)).toList();
    return _stops!;
  }

  /// Find the nearest stop to the given lat/lon.
  /// Returns a record of (BusStop, distanceInMeters).
  Future<({BusStop stop, double distanceMeters})> findNearestStop(
      double userLat, double userLon) async {
    final stops = await loadStops();

    BusStop? nearest;
    double minDist = double.infinity;

    for (final stop in stops) {
      final dist = _haversineMeters(userLat, userLon, stop.latitude, stop.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }

    return (stop: nearest!, distanceMeters: minDist);
  }

  /// Haversine formula — returns distance in meters between two lat/lon points.
  static double _haversineMeters(
      double lat1, double lon1, double lat2, double lon2) {
    const earthRadius = 6371000.0; // meters
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) *
            cos(_toRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  static double _toRadians(double deg) => deg * pi / 180;
}
