"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../utils/helpers';
import { useSidebarStore } from '../../store/index.js';
import { ChevronLeft, Menu } from 'lucide-react';

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function Sidebar({ title, subtitle, navGroups, footerContent, logo }) {
  const { open, setOpen } = useSidebarStore();
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setOpen(false); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        'sidebar',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        !open && 'md:w-0 md:overflow-hidden md:border-0'
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{logo || title?.charAt(0) || 'L'}</span>
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="font-semibold text-surface-800 dark:text-white text-sm leading-tight truncate">{title || 'LMS'}</p>
            {subtitle && <p className="text-xs text-surface-400 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-hide space-y-0.5">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && (
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest px-3 mb-1.5 mt-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.to || pathname.startsWith(item.to + '/');
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={cn(
                      'nav-item group',
                      isActive && 'active'
                    )}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto badge badge-primary text-[10px]">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer slot */}
        {footerContent && (
          <div className="px-2 pb-3 pt-2 border-t border-surface-100 dark:border-surface-800 flex-shrink-0">
            {footerContent}
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
export function Topbar({ title, actions, breadcrumbs, user, onProfileClick }) {
  const { toggle } = useSidebarStore();

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border-b border-surface-100 dark:border-surface-800 flex items-center gap-3 px-4 h-[60px]">
      {/* Hamburger */}
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors flex-shrink-0"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumbs / Title */}
      <div className="flex-1 min-w-0">
        {breadcrumbs ? (
          <nav className="flex items-center gap-1 text-sm flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-surface-300 dark:text-surface-600 text-xs">/</span>}
                <span className={cn(
                  i === breadcrumbs.length - 1
                    ? 'font-semibold text-surface-800 dark:text-white'
                    : 'text-surface-400 dark:text-surface-500'
                )}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="font-semibold text-surface-800 dark:text-white text-sm truncate">{title}</h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        {user && (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {(user.firstName || user.name || 'U')?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-surface-800 dark:text-white leading-tight">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name}
              </p>
              <p className="text-[10px] text-surface-400 capitalize">{user.role}</p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, breadcrumbs, actions, onBack, className }) {
  return (
    <div className={cn('page-header', className)}>
      <div className="flex items-start gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <nav className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500 mb-0.5 flex-wrap">
              {breadcrumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <span className={i === breadcrumbs.length - 1 ? 'text-surface-500' : ''}>{c}</span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-lg font-semibold text-surface-800 dark:text-white leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────
export function DashboardLayout({ sidebar, children }) {
  const { open } = useSidebarStore();
  return (
    <div className="flex min-h-screen">
      {sidebar}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-200',
        open ? 'md:ml-[240px]' : 'md:ml-0'
      )}>
        {children}
      </div>
    </div>
  );
}
