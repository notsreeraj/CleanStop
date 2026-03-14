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

  File? _selectedImage;
  String _selectedCategory = 'Cleanliness';
  bool _isSubmitting = false;

  // Location & nearest stop state
  bool _isFetchingLocation = false;
  String? _locationError;
  BusStop? _nearestStop;
  double? _nearestStopDistance; // in meters
  double? _userLat;
  double? _userLon;

  File? get selectedImage => _selectedImage;
  String get selectedCategory => _selectedCategory;
  bool get isSubmitting => _isSubmitting;
  bool get isFetchingLocation => _isFetchingLocation;
  String? get locationError => _locationError;
  BusStop? get nearestStop => _nearestStop;
  double? get nearestStopDistanceMeters => _nearestStopDistance;
  double? get userLat => _userLat;
  double? get userLon => _userLon;

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
      _selectedImage != null || descController.text.trim().isNotEmpty;

  /// Fetch device location, find nearest stop, and update state.
  Future<void> fetchNearestStop() async {
    _isFetchingLocation = true;
    _locationError = null;
    notifyListeners();

    try {
      final position = await _locationService.getCurrentPosition();
      _userLat = position.latitude;
      _userLon = position.longitude;

      final result =
          await _stopService.findNearestStop(_userLat!, _userLon!);
      _nearestStop = result.stop;
      _nearestStopDistance = result.distanceMeters;
    } catch (e) {
      _locationError = e.toString();
      _nearestStop = null;
      _nearestStopDistance = null;
    } finally {
      _isFetchingLocation = false;
      notifyListeners();
    }
  }

  Future<bool> submit() async {
    if (!canSubmit) return false;

    _isSubmitting = true;
    notifyListeners();

    // Automatically fetch location + nearest stop on submit
    if (_nearestStop == null) {
      await fetchNearestStop();
      if (_locationError != null) {
        _isSubmitting = false;
        notifyListeners();
        return false;
      }
    }

    // Simulate API call — replace with real service later
    await Future.delayed(const Duration(seconds: 2));

    _isSubmitting = false;
    notifyListeners();

    return true;
  }

  void resetForm() {
    _selectedImage = null;
    descController.clear();
    _selectedCategory = 'Cleanliness';
    _nearestStop = null;
    _nearestStopDistance = null;
    _userLat = null;
    _userLon = null;
    _locationError = null;
    notifyListeners();
  }

  @override
  void dispose() {
    descController.dispose();
    super.dispose();
  }
}
