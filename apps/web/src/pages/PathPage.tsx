import { PlaceholderPage } from '../components/PlaceholderPage';
import { OpeningItem } from '../components/ui/Opening';
import { ProgressSummary } from '../progress/ProgressSummary';
import { t } from '../i18n';

export default function PathPage() {
  return (
    <div className="flex flex-col gap-4">
      <OpeningItem index={0}>
        <ProgressSummary />
      </OpeningItem>
      <OpeningItem index={1}>
        <PlaceholderPage title={t('path.title')} description={t('path.description')} />
      </OpeningItem>
    </div>
  );
}
