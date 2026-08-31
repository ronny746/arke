import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { useSidebarStore } from '../../store/index.js';

export function Sidebar({ logo, title, subtitle, navGroups, footerContent, accentColor = 'primary' }) {
  const { open, setOpen } = useSidebarStore();
  const location = useLocation();

  // Auto-close on mobile
  useEffect(() => {
    const handler = () => { if (window.innerWidth < 768) setOpen(false); };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={cn(
        'sidebar transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        !open && 'md:w-0 md:overflow-hidden'
      )} style={{ '--sidebar-width': open ? '260px' : '0px' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-100 dark:border-surface-700 flex-shrink-0">
          {logo ? (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-${accentColor} to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {logo}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">L</span>
            </div>
          )}
          <div className="overflow-hidden">
            <p className="font-bold text-surface-800 dark:text-white text-sm leading-tight truncate">{title || 'LMS Portal'}</p>
            {subtitle && <p className="text-xs text-surface-400 dark:text-surface-500 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && (
                <p className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider px-3 mb-2">{group.label}</p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn('nav-item', isActive && 'active')}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto badge badge-primary text-xs">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {footerContent && (
          <div className="p-4 border-t border-surface-100 dark:border-surface-700 flex-shrink-0">
            {footerContent}
          </div>
        )}
      </aside>
    </>
  );
}

export function Topbar({ title, actions, breadcrumbs, user, onProfileClick }) {
  const { toggle, open } = useSidebarStore();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-100 dark:border-surface-700 flex items-center gap-4 px-4 md:px-6 h-16">
      {/* Menu toggle */}
      <button
        onClick={toggle}
        className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Breadcrumbs / Title */}
      <div className="flex-1 overflow-hidden">
        {breadcrumbs ? (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-surface-300 dark:text-surface-600">/</span>}
                <span className={cn(i === breadcrumbs.length - 1 ? 'font-semibold text-surface-800 dark:text-white' : 'text-surface-400 dark:text-surface-500 hover:text-surface-600 cursor-pointer')}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="font-semibold text-surface-800 dark:text-white truncate">{title}</h1>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        {user && (
          <button onClick={onProfileClick} className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-semibold">
              {user.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-surface-800 dark:text-white leading-tight">{user.name}</p>
              <p className="text-xs text-surface-400 dark:text-surface-500">{user.role}</p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, onBack, className }) {
  return (
    <div className={cn('page-header flex items-center justify-between', className)}>
      <div className="flex items-start gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-1 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors"
            title="Go Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div>
          {breadcrumbs && (
            <nav className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500 mb-1">
              {breadcrumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <span className={i === breadcrumbs.length - 1 ? 'text-surface-500 dark:text-surface-400' : ''}>{c}</span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-bold text-surface-800 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function DashboardLayout({ sidebar, children }) {
  const { open } = useSidebarStore();
  return (
    <div className="flex min-h-screen">
      {sidebar}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300', open ? 'md:ml-[260px]' : 'md:ml-0')}>
        {children}
      </div>
    </div>
  );
}
