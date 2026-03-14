import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF6C63FF);
  static const Color secondary = Color(0xFF48CAE4);
  static const Color background = Color(0xFFF4F6FB);
  static const Color darkText = Color(0xFF1A1A2E);
  static const Color success = Color(0xFF4CAF50);
  static const Color error = Color(0xFFE53935);
  static const Color cameraPurple = Color(0xFF9B59B6);
  static const Color galleryBlue = Color(0xFF0096C7);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient horizontalGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cameraGradient = LinearGradient(
    colors: [primary, cameraPurple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient galleryGradient = LinearGradient(
    colors: [secondary, galleryBlue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient iconBgGradient = LinearGradient(
    colors: [Color(0xFFEDE9FF), Color(0xFFE0F7FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
