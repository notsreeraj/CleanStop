import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  static TextStyle heading = GoogleFonts.poppins(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: Colors.white,
  );

  static TextStyle subtitle = GoogleFonts.poppins(
    fontSize: 12,
    color: Colors.white70,
  );

  static TextStyle sectionLabel = GoogleFonts.poppins(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.darkText,
  );

  static TextStyle chipText({required bool selected}) => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: selected ? Colors.white : Colors.grey.shade700,
      );

  static TextStyle bodyInput = GoogleFonts.poppins(
    fontSize: 13.5,
    color: Colors.black87,
  );

  static TextStyle hintText = GoogleFonts.poppins(
    fontSize: 13,
    color: Colors.grey.shade400,
  );

  static TextStyle buttonText = GoogleFonts.poppins(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: Colors.white,
  );

  static TextStyle snackbar = GoogleFonts.poppins(fontSize: 13);

  static TextStyle sheetTitle = GoogleFonts.poppins(
    fontSize: 17,
    fontWeight: FontWeight.w700,
  );

  static TextStyle sheetSubtitle = GoogleFonts.poppins(
    fontSize: 12,
    color: Colors.grey.shade400,
  );
}
