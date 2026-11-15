import { Outlet } from 'react-router-dom';
import { t } from '../i18n';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pt-[env(safe-area-inset-top)]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:m-2 focus:rounded-card focus:bg-primary focus:p-3 focus:text-on-primary"
      >
        {t('app.skipToContent')}
      </a>
      <header className="px-4 py-3">
        <p className="text-lg font-bold text-primary">{t('app.name')}</p>
      </header>
      <main id="conteudo" className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
