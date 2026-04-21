// src/features/food/FoodSheet.tsx
// Stub — Task 3 overwrites with the full D-05 vertical composition
// (MacroTotalsBar -> Recent chips -> Frequent chips -> FoodPicker -> TodayMealList).
// Intentionally renders nothing so Task 1 leaves the tree in a compilable state (W-04).
export function FoodSheet({ onClose }: { onClose: () => void }) {
  // `onClose` is the final converged signature (Task 3 composition uses it for D-04
  // close-on-log). The stub accepts it now so FoodSection.tsx can pass the prop
  // without a type error between tasks.
  void onClose;
  return null;
}
