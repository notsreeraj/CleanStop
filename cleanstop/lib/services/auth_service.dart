import 'package:flutter_dotenv/flutter_dotenv.dart';

class AuthService {
  AuthService._();

  static String get publishableKey =>
      dotenv.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ?? '';
}
