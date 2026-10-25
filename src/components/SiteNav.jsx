import { Link, useLocation } from 'react-router-dom';
import style from './SiteNav.module.css';

const NAV_ITEMS = [
  { label: 'About', href: '#about', type: 'anchor' },
  { label: 'Experience', href: '#experience', type: 'anchor' },
  { label: 'Work', href: '#work', type: 'anchor' },
  { label: 'Infrastructure', href: '#infra', type: 'anchor' },
  { label: 'Stack', href: '#stack', type: 'anchor' },
  { label: 'DevOps', href: '/devops', type: 'route' },
  { label: 'Contact', href: '#contact', type: 'anchor' },
];

export default function SiteNav({ variant = 'home' }) {
  const { pathname } = useLocation();

  // On the DevOps page, anchor links should go to home first
  const resolveHref = (item) => {
    if (item.type === 'route') return item.href;
    if (variant === 'devops') return `/${item.href}`;   // "/#about"
    return item.href;                                    // "#about"
  };

  const isCurrent = (item) => {
    if (item.type === 'route') return pathname.startsWith(item.href);
    return false;
  };

  return (
    <nav className={style.nav}>
      <Link to="/" className={style.navLogo}>
        PBW<span className={style.accent}>.</span>
      </Link>
      <div className={style.navLinks}>
        {NAV_ITEMS.map(item => {
          const current = isCurrent(item);
          const className = current ? `${style.navLink} ${style.navLinkCurrent}` : style.navLink;

          if (item.type === 'route') {
            return (
              <Link
                key={item.label}
                to={item.href}
                className={className}
                aria-current={current ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <a key={item.label} href={resolveHref(item)} className={className}>
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}