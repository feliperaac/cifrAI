import { NavLink } from 'react-router-dom';
import { t, type MessageKey } from '../i18n';
import { PathIcon, ProfileIcon, TunerIcon } from './Icons';

const items: { to: string; label: MessageKey; icon: () => React.JSX.Element }[] = [
  { to: '/', label: 'nav.path', icon: PathIcon },
  { to: '/afinador', label: 'nav.tuner', icon: TunerIcon },
  { to: '/perfil', label: 'nav.profile', icon: ProfileIcon },
];

export function BottomNav() {
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive ? 'text-primary underline underline-offset-4' : 'text-muted'
                }`
              }
            >
              <Icon />
              <span>{t(label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
