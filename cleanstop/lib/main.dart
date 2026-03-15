import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'screens/login/login_screen.dart';
import 'screens/report_issue/report_issue_screen.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'utils/app_colors.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ClerkAuth(
      config: ClerkAuthConfig(
        publishableKey: AuthService.publishableKey,
      ),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'CleanStop',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
          useMaterial3: true,
          extensions: [
            ClerkThemeExtension(
              colors: const ClerkThemeColors(
                background: Colors.white,
                altBackground: Color(0xFFE8F5E9),
                borderSide: Color(0xFFCCCCCC),
                text: Color(0xFF1A2E1A),
                icon: Color(0xFF5F6062),
                lightweightText: Color(0xFF999999),
                error: Color(0xFFE53935),
                accent: Color(0xFF00703C),
              ),
            ),
          ],
        ),
        home: const _AuthGate(),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    return ClerkAuthBuilder(
      signedInBuilder: (context, auth) => _SignedInWrapper(auth: auth),
      signedOutBuilder: (context, auth) => const LoginScreen(),
    );
  }
}

class _SignedInWrapper extends StatefulWidget {
  final ClerkAuthProvider auth;
  const _SignedInWrapper({required this.auth});

  @override
  State<_SignedInWrapper> createState() => _SignedInWrapperState();
}

class _SignedInWrapperState extends State<_SignedInWrapper> {
  bool _userSynced = false;

  @override
  void initState() {
    super.initState();
    _syncUser();
  }

  Future<void> _syncUser() async {
    final user = widget.auth.client.user;
    if (user != null && !_userSynced) {
      final userId = user.id;
      final name = [
        user.firstName ?? '',
        user.lastName ?? '',
      ].where((s) => s.isNotEmpty).join(' ');
      final email = user.emailAddresses.isNotEmpty
          ? user.emailAddresses.first.emailAddress
          : '';

      if (userId.isNotEmpty && email.isNotEmpty) {
        await ApiService.upsertUser(
          userId: userId,
          name: name.isNotEmpty ? name : 'User',
          email: email,
        );
      }
      _userSynced = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return const ReportIssueScreen();
  }
}

