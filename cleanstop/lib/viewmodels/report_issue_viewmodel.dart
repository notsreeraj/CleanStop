import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/bus_stop.dart';
import '../services/image_picker_service.dart';
import '../services/location_service.dart';
import '../services/stop_service.dart';

class ReportIssueViewModel extends ChangeNotifier {
  final ImagePickerService _imageService = ImagePickerService();
  final LocationService _locationService = LocationService();
  final StopService _stopService = StopService();
  final TextEditingController descController = TextEditingController();

  static const double maxDistanceMeters = 40.0;

  File? _selectedImage;
  String _selectedCategory = 'Snow / Ice';
  bool _isSubmitting = false;

  // Location & nearest stop state
  bool _isFetchingLocation = false;
  String? _locationError;
  BusStop? _nearestStop;
  double? _nearestStopDistance; // in meters
  double? _userLat;
  double? _userLon;

  StreamSubscription? _positionSub;

  File? get selectedImage => _selectedImage;
  String get selectedCategory => _selectedCategory;
  bool get isSubmitting => _isSubmitting;
  bool get isFetchingLocation => _isFetchingLocation;
  String? get locationError => _locationError;
  BusStop? get nearestStop => _nearestStop;
  double? get nearestStopDistanceMeters => _nearestStopDistance;
  double? get userLat => _userLat;
  double? get userLon => _userLon;

  /// Whether the user is within 40m of the nearest stop.
  bool get isWithinRange =>
      _nearestStop != null && _nearestStopDistance != null && _nearestStopDistance! <= maxDistanceMeters;

  String get nearestStopDistanceFormatted {
    if (_nearestStopDistance == null) return '';
    if (_nearestStopDistance! >= 1000) {
      return '${(_nearestStopDistance! / 1000).toStringAsFixed(2)} km';
    }
    return '${_nearestStopDistance!.toStringAsFixed(0)} m';
  }

  void selectCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> pickImage(ImageSource source) async {
    final file = await _imageService.pickImage(source);
    if (file != null) {
      _selectedImage = file;
      notifyListeners();
    }
  }

  void removeImage() {
    _selectedImage = null;
    notifyListeners();
  }

  bool get canSubmit =>
      (_selectedImage != null || descController.text.trim().isNotEmpty) && isWithinRange;

  /// Start real-time location tracking. Call once when screen opens.
  Future<void> startLocationTracking() async {
    _isFetchingLocation = true;
    _locationError = null;
    notifyListeners();

    try {
      // Initial position fetch (also triggers permission request)
      final position = await _locationService.getCurrentPosition();
      await _updateNearestStop(position.latitude, position.longitude);

      _isFetchingLocation = false;
      notifyListeners();

      // Subscribe to continuous position updates
      _positionSub = _locationService.getPositionStream().listen(
        (position) async {
          await _updateNearestStop(position.latitude, position.longitude);
        },
        onError: (e) {
          _locationError = e.toString();
          notifyListeners();
        },
      );
    } catch (e) {
      _locationError = e.toString();
      _nearestStop = null;
      _nearestStopDistance = null;
      _isFetchingLocation = false;
      notifyListeners();
    }
  }

  /// Update nearest stop from given coordinates.
  Future<void> _updateNearestStop(double lat, double lon) async {
    _userLat = lat;
    _userLon = lon;
    try {
      final result = await _stopService.findNearestStop(lat, lon);
      _nearestStop = result.stop;
      _nearestStopDistance = result.distanceMeters;
    } catch (e) {
      _locationError = e.toString();
      _nearestStop = null;
      _nearestStopDistance = null;
    }
    notifyListeners();
  }

  void stopLocationTracking() {
    _positionSub?.cancel();
    _positionSub = null;
  }

  Future<bool> submit() async {
    if (!canSubmit) return false;

    _isSubmitting = true;
    notifyListeners();

    // Simulate API call — replace with real service later
    await Future.delayed(const Duration(seconds: 2));

    _isSubmitting = false;
    notifyListeners();

    return true;
  }

  void resetForm() {
    _selectedImage = null;
    descController.clear();
    _selectedCategory = 'Snow / Ice';
    _nearestStop = null;
    _nearestStopDistance = null;
    _userLat = null;
    _userLon = null;
    _locationError = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stopLocationTracking();
    descController.dispose();
    super.dispose();
  }
}
