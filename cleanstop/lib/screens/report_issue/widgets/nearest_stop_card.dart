import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../models/bus_stop.dart';
import '../../../utils/app_colors.dart';

class NearestStopCard extends StatelessWidget {
  final BusStop stop;
  final String distanceFormatted;
  final bool isWithinRange;
  final double? userLat;
  final double? userLon;

  const NearestStopCard({
    super.key,
    required this.stop,
    required this.distanceFormatted,
    required this.isWithinRange,
    this.userLat,
    this.userLon,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = isWithinRange ? AppColors.success : AppColors.error;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isWithinRange
              ? [const Color(0xFFE8F5E9), const Color(0xFFE0F7FA)]
              : [const Color(0xFFFCE4EC), const Color(0xFFFFF3E0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withAlpha(60)),
        boxShadow: [
          BoxShadow(
            color: statusColor.withAlpha(25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isWithinRange ? Icons.location_on_rounded : Icons.location_off_rounded,
                  color: statusColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nearest Bus Stop',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      stop.stopName,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1A1A2E),
                      ),
                    ),
                  ],
                ),
              ),
              // Range badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(25),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withAlpha(60)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isWithinRange ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 13,
                      color: statusColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isWithinRange ? 'In Range' : 'Too Far',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Detail chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(
                icon: Icons.straighten_rounded,
                label: distanceFormatted,
              ),
              _InfoChip(
                icon: Icons.tag_rounded,
                label: 'Stop #${stop.stopCode}',
              ),
              if (userLat != null && userLon != null)
                _InfoChip(
                  icon: Icons.my_location_rounded,
                  label:
                      '${userLat!.toStringAsFixed(4)}, ${userLon!.toStringAsFixed(4)}',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(200),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.grey.shade600),
          const SizedBox(width: 5),
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
