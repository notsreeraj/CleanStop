import 'package:flutter/material.dart';

class CategoryData {
  CategoryData._();

  static const List<String> categories = [
    'Cleanliness',
    'Damaged Facility',
    'Safety Hazard',
    'Other',
  ];

  static const Map<String, IconData> icons = {
    'Cleanliness': Icons.cleaning_services_rounded,
    'Damaged Facility': Icons.construction_rounded,
    'Safety Hazard': Icons.warning_amber_rounded,
    'Other': Icons.more_horiz_rounded,
  };
}
