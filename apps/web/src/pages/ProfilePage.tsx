import { PlaceholderPage } from '../components/PlaceholderPage';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { t } from '../i18n';

export default function ProfilePage() {
  return (
    <PlaceholderPage title={t('profile.title')} description={t('profile.description')}>
      <ThemeSwitcher />
    </PlaceholderPage>
  );
}
