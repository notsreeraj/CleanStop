import 'dart:io';

class IssueReport {
  final String category;
  final String description;
  final File? image;

  const IssueReport({
    required this.category,
    required this.description,
    this.image,
  });
}
