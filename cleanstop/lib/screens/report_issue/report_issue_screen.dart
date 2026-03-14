import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../utils/app_colors.dart';
import '../../utils/app_text_styles.dart';
import '../../viewmodels/report_issue_viewmodel.dart';
import 'widgets/section_label.dart';
import 'widgets/category_chips.dart';
import 'widgets/image_upload_card.dart';
import 'widgets/image_source_sheet.dart';
import 'widgets/nearest_stop_card.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen>
    with SingleTickerProviderStateMixin {
  late final ReportIssueViewModel _vm;
  late final AnimationController _animController;
  late final Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _vm = ReportIssueViewModel()..addListener(_onVmChanged);
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  void _onVmChanged() => setState(() {});

  @override
  void dispose() {
    _vm
      ..removeListener(_onVmChanged)
      ..dispose();
    _animController.dispose();
    super.dispose();
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => ImageSourceSheet(onTap: _onImageSourceSelected),
    );
  }

  void _onImageSourceSelected(ImageSource source) {
    _vm.pickImage(source);
  }

  Future<void> _submit() async {
    if (!_vm.canSubmit) {
      _showSnack('Please add an image or description.', success: false);
      return;
    }
    final ok = await _vm.submit();
    if (!mounted) return;

    if (_vm.locationError != null) {
      _showSnack('Location error: ${_vm.locationError}', success: false);
      return;
    }

    if (ok && _vm.nearestStop != null) {
      _showSnack(
        'Nearest stop: ${_vm.nearestStop!.stopName} (${_vm.nearestStopDistanceFormatted})',
        success: true,
      );
    } else if (!ok) {
      _showSnack('Submission failed.', success: false);
    }
  }

  void _showSnack(String msg, {required bool success}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              success ? Icons.check_circle_rounded : Icons.error_rounded,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Text(msg, style: AppTextStyles.snackbar),
          ],
        ),
        backgroundColor: success ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          SliverToBoxAdapter(child: _buildBody()),
        ],
      ),
    );
  }

  // ── App Bar ────────────────────────────────────────────────
  SliverAppBar _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      backgroundColor: AppColors.primary,
      elevation: 0,
      leading: const SizedBox(),
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax,
        background: Container(
          decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
          child: Stack(
            children: [
              Positioned(
                top: -30,
                right: -20,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.07),
                  ),
                ),
              ),
              Positioned(
                bottom: -40,
                left: -30,
                child: Container(
                  width: 130,
                  height: 130,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(
                              Icons.report_problem_rounded,
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Report an Issue',
                                  style: AppTextStyles.heading),
                              Text('Help us keep CleanStop safe & clean',
                                  style: AppTextStyles.subtitle),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Body ───────────────────────────────────────────────────
  Widget _buildBody() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category
          const SectionLabel(
              label: 'Issue Category', icon: Icons.category_rounded),
          const SizedBox(height: 12),
          CategoryChips(
            selectedCategory: _vm.selectedCategory,
            onSelected: _vm.selectCategory,
          ),

          const SizedBox(height: 28),

          // Image
          const SectionLabel(
              label: 'Attach a Photo', icon: Icons.image_rounded),
          const SizedBox(height: 12),
          GestureDetector(
            onTapDown: (_) => _animController.forward(),
            onTapUp: (_) {
              _animController.reverse();
              _showImageSourceSheet();
            },
            onTapCancel: () => _animController.reverse(),
            child: ImageUploadCard(
              selectedImage: _vm.selectedImage,
              scaleAnimation: _scaleAnim,
              onTap: _showImageSourceSheet,
              onRemove: _vm.removeImage,
            ),
          ),

          const SizedBox(height: 28),

          // Description
          const SectionLabel(
              label: 'Describe the Issue', icon: Icons.edit_note_rounded),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: TextField(
              controller: _vm.descController,
              maxLines: 6,
              maxLength: 500,
              style: AppTextStyles.bodyInput,
              decoration: InputDecoration(
                hintText:
                    'Describe what you see…\ne.g. "Trash overflow near gate 3, needs urgent attention."',
                hintStyle: AppTextStyles.hintText,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.all(20),
                counterStyle: GoogleFonts.poppins(
                    fontSize: 11, color: Colors.grey.shade400),
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Nearest Stop result (shown after submit)
          if (_vm.isFetchingLocation)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Column(
                children: [
                  const SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: AppColors.primary),
                  ),
                  const SizedBox(height: 10),
                  Text('Finding nearest stop...',
                      style: GoogleFonts.poppins(
                          fontSize: 12, color: Colors.grey.shade500)),
                ],
              ),
            ),

          if (_vm.nearestStop != null && !_vm.isFetchingLocation) ...[
            NearestStopCard(
              stop: _vm.nearestStop!,
              distanceFormatted: _vm.nearestStopDistanceFormatted,
              userLat: _vm.userLat,
              userLon: _vm.userLon,
            ),
            const SizedBox(height: 20),
          ],

          if (_vm.locationError != null && !_vm.isFetchingLocation)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.error.withAlpha(20),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.error.withAlpha(50)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      color: AppColors.error, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _vm.locationError!,
                      style: GoogleFonts.poppins(
                          fontSize: 12, color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 20),

          // Submit
          _buildSubmitButton(),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      width: double.infinity,
      height: 58,
      decoration: BoxDecoration(
        gradient: _vm.isSubmitting ? null : AppColors.horizontalGradient,
        color:
            _vm.isSubmitting ? AppColors.primary.withOpacity(0.4) : null,
        borderRadius: BorderRadius.circular(18),
        boxShadow: _vm.isSubmitting
            ? []
            : [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
      ),
      child: TextButton(
        onPressed: _vm.isSubmitting ? null : _submit,
        style: TextButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        child: _vm.isSubmitting
            ? const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2.5),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send_rounded,
                      color: Colors.white, size: 18),
                  const SizedBox(width: 10),
                  Text('Submit Issue', style: AppTextStyles.buttonText),
                ],
              ),
      ),
    );
  }
}
