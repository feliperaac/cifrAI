import { Outlet, useLocation } from 'react-router-dom';
import { t } from '../i18n';
import { BottomNav } from './BottomNav';
import { useOpening, Wordmark } from './ui/Opening';

export function AppLayout() {
  const home = useLocation().pathname === '/';
  const opening = useOpening(home);
  return (
    <div
      data-opening={opening}
      className="mx-auto flex min-h-dvh max-w-md flex-col pt-[env(safe-area-inset-top)]"
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:m-2 focus:rounded-card focus:bg-primary focus:p-3 focus:text-on-primary"
      >
        {t('app.skipToContent')}
      </a>
      <header className="px-4 py-3">
        {home ? (
          <Wordmark />
        ) : (
          <p className="font-display text-lg font-extrabold text-primary">{t('app.name')}</p>
        )}
      </header>
      <main id="conteudo" className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
