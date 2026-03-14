class BusStop {
  final int stopId;
  final int stopCode;
  final String stopName;
  final double latitude;
  final double longitude;
  final int wheelchairBoarding;

  const BusStop({
    required this.stopId,
    required this.stopCode,
    required this.stopName,
    required this.latitude,
    required this.longitude,
    required this.wheelchairBoarding,
  });

  /// Parse one CSV row into a BusStop.
  /// Expected header order:
  /// stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,...,wheelchair_boarding,...
  factory BusStop.fromCsvRow(String row) {
    final cols = row.split(',');
    return BusStop(
      stopId: int.parse(cols[0].trim()),
      stopCode: int.parse(cols[1].trim()),
      stopName: cols[2].trim(),
      latitude: double.parse(cols[4].trim()),
      longitude: double.parse(cols[5].trim()),
      wheelchairBoarding: int.tryParse(cols[11].trim()) ?? 0,
    );
  }
}
