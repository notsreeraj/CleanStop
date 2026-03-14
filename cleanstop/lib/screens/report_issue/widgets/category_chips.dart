import 'package:flutter/material.dart';
import '../../../utils/app_colors.dart';
import '../../../utils/category_data.dart';
import '../../../utils/app_text_styles.dart';

class CategoryChips extends StatelessWidget {
  final String selectedCategory;
  final ValueChanged<String> onSelected;

  const CategoryChips({
    super.key,
    required this.selectedCategory,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: CategoryData.categories.map((cat) {
          final selected = selectedCategory == cat;
          return GestureDetector(
            onTap: () => onSelected(cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 10),
              padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: selected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color:
                      selected ? AppColors.primary : Colors.grey.shade200,
                ),
                boxShadow: selected
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : [],
              ),
              child: Row(
                children: [
                  Icon(
                    CategoryData.icons[cat]!,
                    size: 15,
                    color: selected
                        ? Colors.white
                        : Colors.grey.shade600,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    cat,
                    style: AppTextStyles.chipText(selected: selected),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
