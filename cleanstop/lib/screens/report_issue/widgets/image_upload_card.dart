import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../utils/app_colors.dart';

class ImageUploadCard extends StatelessWidget {
  final File? selectedImage;
  final Animation<double> scaleAnimation;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const ImageUploadCard({
    super.key,
    required this.selectedImage,
    required this.scaleAnimation,
    required this.onTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ScaleTransition(
        scale: scaleAnimation,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: 220,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: selectedImage != null
                  ? AppColors.primary
                  : Colors.grey.shade200,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.08),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: selectedImage != null
              ? _buildImagePreview()
              : _buildPlaceholder(),
        ),
      ),
    );
  }

  Widget _buildImagePreview() {
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Image.file(selectedImage!, fit: BoxFit.cover),
        ),
        Positioned(
          top: 10,
          right: 10,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.55),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded,
                  color: Colors.white, size: 16),
            ),
          ),
        ),
        Positioned(
          bottom: 12,
          right: 12,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.edit_rounded,
                    color: Colors.white, size: 12),
                const SizedBox(width: 4),
                Text(
                  'Change',
                  style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: const BoxDecoration(
            gradient: AppColors.iconBgGradient,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.add_photo_alternate_rounded,
            size: 38,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Tap to upload a photo',
          style: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Camera · Gallery',
          style:
              GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade400),
        ),
      ],
    );
  }
}
