import { useEffect, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const resolveHref = (item) => {
    if (item.type === 'route') return item.href;
    if (variant === 'devops') return `/${item.href}`;
    return item.href;
  };

  const isCurrent = (item) => {
    if (item.type === 'route') return pathname.startsWith(item.href);
    return false;
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={style.nav}>
      <div className={style.navBar}>
        <Link to="/" className={style.navLogo} onClick={closeMenu}>
          PBW<span className={style.accent}>.</span>
        </Link>

        {/* Desktop links */}
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

        {/* Mobile toggle */}
        <button
          type="button"
          className={`${style.menuToggle} ${menuOpen ? style.menuToggleOpen : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
        >
          <span className={style.menuBar} />
          <span className={style.menuBar} />
          <span className={style.menuBar} />
        </button>
      </div>

      {/* Slide-down drawer — part of the nav flow, not a fixed overlay */}
      <div
        id="mobile-nav"
        className={`${style.drawer} ${menuOpen ? style.drawerOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className={style.drawerInner}>
          {NAV_ITEMS.map((item, i) => {
            const current = isCurrent(item);
            const className = current
              ? `${style.drawerLink} ${style.drawerLinkCurrent}`
              : style.drawerLink;

            const content = (
              <>
                <span className={style.drawerNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={style.drawerLabel}>{item.label}</span>
                <span className={style.drawerArrow}>→</span>
              </>
            );

            if (item.type === 'route') {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={className}
                  onClick={closeMenu}
                  aria-current={current ? 'page' : undefined}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {content}
                </Link>
              );
            }

            return (
              <a
                key={item.label}
                href={resolveHref(item)}
                className={className}
                onClick={closeMenu}
                tabIndex={menuOpen ? 0 : -1}
              >
                {content}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}