import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../utils/app_colors.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isSmall = size.height < 700;

    return ClerkErrorListener(
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Column(
          children: [
            // Green gradient header
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                      24, isSmall ? 16 : 28, 24, isSmall ? 24 : 36),
                  child: Column(
                    children: [
                      // DRT Logo
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: SvgPicture.asset(
                          'assets/drt_logo.svg',
                          width: isSmall ? 44 : 56,
                          height: isSmall ? 44 : 56,
                          colorFilter: const ColorFilter.mode(
                            Colors.white,
                            BlendMode.srcIn,
                          ),
                        ),
                      ),
                      SizedBox(height: isSmall ? 14 : 20),
                      Text(
                        'Welcome to CleanStop',
                        style: GoogleFonts.poppins(
                          fontSize: isSmall ? 20 : 24,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Sign in to report transit issues',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Auth form area
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: isSmall ? 16 : 28,
                    ),
                    child: const ClerkAuthentication(),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
