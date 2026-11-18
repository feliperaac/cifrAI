import { OpeningItem } from '../components/ui/Opening';
import { t } from '../i18n';
import { PathSection } from '../path/PathSection';
import { DailyGoalCard } from '../progress/DailyGoalCard';
import { ProgressSummary } from '../progress/ProgressSummary';
import { StreakCard } from '../progress/StreakCard';

export default function PathPage() {
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-4 py-4">
      <h1 id="page-title" className="m-0 font-display text-2xl font-extrabold">
        {t('path.title')}
      </h1>
      <OpeningItem index={0}>
        <div className="flex flex-col gap-3">
          <ProgressSummary />
          <div className="grid gap-3 md:grid-cols-2">
            <StreakCard />
            <DailyGoalCard />
          </div>
        </div>
      </OpeningItem>
      <OpeningItem index={1}>
        <PathSection />
      </OpeningItem>
    </section>
  );
}
