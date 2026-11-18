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
    <nav aria-label={t('nav.label')} className="app-nav">
      <ul className="app-nav__list">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="app-nav__item">
            <NavLink to={to} end={to === '/'} className="app-nav__link">
              <Icon />
              <span>{t(label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
