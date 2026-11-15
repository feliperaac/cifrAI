import { Link } from 'react-router-dom';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { t } from '../i18n';

export default function NotFoundPage() {
  return (
    <PlaceholderPage title={t('notFound.title')} description={t('notFound.description')}>
      <Link
        to="/"
        className="flex min-h-tap items-center justify-center rounded-card bg-primary px-4 font-semibold text-on-primary"
      >
        {t('notFound.back')}
      </Link>
    </PlaceholderPage>
  );
}
