import { PlaceholderPage } from '../components/PlaceholderPage';
import { FeedbackSoundsToggle } from '../components/FeedbackSoundsToggle';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { t } from '../i18n';
import { GoalPicker } from '../progress/GoalPicker';
import { ProgressSummary } from '../progress/ProgressSummary';
import { WeekCalendar } from '../progress/WeekCalendar';

export default function ProfilePage() {
  return (
    <PlaceholderPage title={t('profile.title')} description={t('profile.description')}>
      <ProgressSummary variant="full" />
      <WeekCalendar />
      <GoalPicker />
      <FeedbackSoundsToggle />
      <ThemeSwitcher />
    </PlaceholderPage>
  );
}
