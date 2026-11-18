import { Outlet, useLocation } from 'react-router-dom';
import { t } from '../i18n';
import { BottomNav } from './BottomNav';
import { useOpening } from './ui/Opening';
import { Wordmark } from './ui/Wordmark';

// Ordem do DOM = ordem de Tab: pular link, menu (barra lateral em lg) e depois o conteúdo.
export function AppLayout() {
  const home = useLocation().pathname === '/';
  const opening = useOpening(home);
  return (
    <div data-opening={opening} className="app-shell">
      <div className="app-column">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:m-2 focus:rounded-card focus:bg-primary focus:p-3 focus:text-on-primary"
        >
          {t('app.skipToContent')}
        </a>
        <header className="app-brand px-4 py-3">
          <Wordmark />
        </header>
        <BottomNav />
        <main id="conteudo" className="flex-1 px-4 pb-24 pt-2 md:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
