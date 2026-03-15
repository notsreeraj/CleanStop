import 'package:flutter/material.dart';

class CategoryData {
  CategoryData._();

  static const List<String> categories = [
    'Snow / Ice',
    'Debris',
    'Structural Damage',
    'Obstruction',
  ];

  static const Map<String, IconData> icons = {
    'Snow / Ice': Icons.ac_unit_rounded,
    'Debris': Icons.delete_outline_rounded,
    'Structural Damage': Icons.handyman_rounded,
    'Obstruction': Icons.block_rounded,
  };
}
