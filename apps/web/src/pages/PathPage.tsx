import { PlaceholderPage } from '../components/PlaceholderPage';
import { OpeningItem } from '../components/ui/Opening';
import { XpBadge } from '../components/ui/XpBadge';
import { t } from '../i18n';

export default function PathPage() {
  return (
    <div className="flex flex-col gap-4">
      <OpeningItem index={0}>
        <XpBadge value={0} />
      </OpeningItem>
      <OpeningItem index={1}>
        <PlaceholderPage title={t('path.title')} description={t('path.description')} />
      </OpeningItem>
    </div>
  );
}
