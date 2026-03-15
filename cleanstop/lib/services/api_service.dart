import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService._();

  static String get _baseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'https://cleanstop.onrender.com';

  static String get _cloudinaryCloudName =>
      dotenv.env['CLOUDINARY_CLOUD_NAME'] ?? '';
  static String get _cloudinaryApiKey =>
      dotenv.env['CLOUDINARY_API_KEY'] ?? '';
  static String get _cloudinaryApiSecret =>
      dotenv.env['CLOUDINARY_API_SECRET'] ?? '';

  // ── Cloudinary Upload ──────────────────────────────────────

  /// Upload image to Cloudinary and return the secure URL.
  static Future<String> uploadImageToCloudinary(File imageFile) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final paramsToSign = 'folder=cleanstop_reports&timestamp=$timestamp${_cloudinaryApiSecret}';
    final signature = sha1.convert(utf8.encode(paramsToSign)).toString();

    final uri = Uri.parse(
      'https://api.cloudinary.com/v1_1/$_cloudinaryCloudName/image/upload',
    );

    final request = http.MultipartRequest('POST', uri)
      ..fields['folder'] = 'cleanstop_reports'
      ..fields['timestamp'] = timestamp.toString()
      ..fields['api_key'] = _cloudinaryApiKey
      ..fields['signature'] = signature
      ..files.add(await http.MultipartFile.fromPath('file', imageFile.path));

    final response = await request.send();
    final body = await response.stream.bytesToString();

    if (response.statusCode != 200) {
      throw Exception('Cloudinary upload failed: $body');
    }

    final data = json.decode(body);
    return data['secure_url'] as String;
  }

  // ── Gemini Image Validation ────────────────────────────────

  /// Validate image using Gemini AI via backend.
  /// Returns a map with {is_valid, reason, confidence}.
  static Future<Map<String, dynamic>> validateImage({
    required String imageUrl,
    required String category,
    String? description,
  }) async {
    final uri = Uri.parse('$_baseUrl/reports/validate-image');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'image_url': imageUrl,
        'category': category,
        'description': description,
      }),
    );

    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? 'Image validation failed');
    }

    return json.decode(response.body) as Map<String, dynamic>;
  }

  // ── Submit Report ──────────────────────────────────────────

  /// Submit a report to the backend via JSON.
  static Future<Map<String, dynamic>> submitReport({
    required int stopId,
    required String issueType,
    String? description,
    String? userId,
    String? photoUrl,
  }) async {
    final uri = Uri.parse('$_baseUrl/reports/submit');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'stop_id': stopId,
        'issue_type': issueType,
        'description': description,
        'user_id': userId,
        'photo_url': photoUrl,
      }),
    );

    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? 'Failed to submit report');
    }

    return json.decode(response.body) as Map<String, dynamic>;
  }

  // ── User Upsert ────────────────────────────────────────────

  /// Create or update user in backend after Clerk login.
  static Future<void> upsertUser({
    required String userId,
    required String name,
    required String email,
  }) async {
    final uri = Uri.parse('$_baseUrl/users');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'user_id': userId,
        'name': name,
        'email': email,
      }),
    );

    if (response.statusCode != 200) {
      // Non-critical — log but don't crash
      // ignore: avoid_print
      print('User upsert failed: ${response.body}');
    }
  }
}
