import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF00703C);
  static const Color secondary = Color(0xFF007647);
  static const Color background = Color(0xFFF4F8F6);
  static const Color darkText = Color(0xFF1A2E1A);
  static const Color success = Color(0xFF2E7D32);
  static const Color error = Color(0xFFE53935);
  static const Color cameraPurple = Color(0xFF388E3C);
  static const Color galleryBlue = Color(0xFF00897B);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00703C), Color(0xFF009950)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient horizontalGradient = LinearGradient(
    colors: [Color(0xFF00703C), Color(0xFF009950)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cameraGradient = LinearGradient(
    colors: [Color(0xFF00703C), Color(0xFF388E3C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient galleryGradient = LinearGradient(
    colors: [Color(0xFF009950), Color(0xFF00897B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient iconBgGradient = LinearGradient(
    colors: [Color(0xFFE8F5E9), Color(0xFFE0F2F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
