import { PTSection } from '@/features/pt/PTSection';
import { FoodSection } from '@/features/food/FoodSection';
import { StepsSection } from '@/features/steps/StepsSection';
import { LiftSection } from '@/features/lifts/LiftSection';

/**
 * Today screen — Phase 2 live-data layout.
 *
 * Phase 1's placeholder `sections` array is replaced by 4 feature components.
 * Each section keeps the Phase 1 card frame (Heading + status row) verbatim;
 * only the status slot goes dynamic per D-05. PT + Food open bottom Sheets on tap (D-01);
 * Steps + Lift stay inline in their cards (D-02).
 */
export function TodayScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <PTSection />
      <FoodSection />
      <StepsSection />
      <LiftSection />
    </div>
  );
}
