'use client';

import { useEffect, useState, type ReactNode } from 'react';
import BrandLogo from '@/components/BrandLogo';
import '@/app/app.css';

export type AppTopBarMenuItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
};

type AppTopBarProps = {
  brandHref?: string;
  title?: string;
  subtitle?: string;
  /** Compact chips / usage / upgrade shown in the top bar (desktop + mobile summary). */
  summary?: ReactNode;
  /** Full action row for desktop only (links, logout, etc.). */
  desktopActions?: ReactNode;
  /** Items rendered in the mobile slide-down menu. */
  menuItems: AppTopBarMenuItem[];
};

export default function AppTopBar({
  brandHref = '/dashboard',
  title,
  subtitle,
  summary,
  desktopActions,
  menuItems,
}: AppTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleItemActivate(item: AppTopBarMenuItem) {
    closeMenu();
    item.onClick?.();
  }

  return (
    <>
      <nav className={`app-topbar${menuOpen ? ' app-topbar-menu-open' : ''}`}>
        <a href={brandHref} className="app-topbar-brand" onClick={closeMenu}>
          <BrandLogo variant="nav" showName={false} />
          {(title || subtitle) && (
            <div className="app-topbar-brand-copy">
              {title ? <div className="app-topbar-title">{title}</div> : null}
              {subtitle ? <div className="app-topbar-subtitle">{subtitle}</div> : null}
            </div>
          )}
        </a>

        <div className="app-topbar-right">
          {summary ? <div className="app-topbar-summary">{summary}</div> : null}
          {desktopActions ? <div className="app-topbar-desktop-actions">{desktopActions}</div> : null}

          <button
            type="button"
            className={`app-nav-toggle${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <>
          <button
            type="button"
            className="app-mobile-backdrop"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="app-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
            {summary ? <div className="app-mobile-menu-summary">{summary}</div> : null}
            <div className="app-mobile-menu-links">
              {menuItems.map((item) => {
                const className = `app-mobile-menu-link${
                  item.variant === 'primary'
                    ? ' app-mobile-menu-link-primary'
                    : item.variant === 'danger'
                      ? ' app-mobile-menu-link-danger'
                      : ''
                }`;

                if (item.href) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={className}
                      onClick={() => handleItemActivate(item)}
                    >
                      {item.label}
                    </a>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={className}
                    onClick={() => handleItemActivate(item)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
