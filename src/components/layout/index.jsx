"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../../utils/helpers';
import { useSidebarStore } from '../../store/index.js';
import { ChevronLeft, Menu, X, Bell, LogOut, User } from 'lucide-react';
import { LogoutConfirmModal } from '../LogoutConfirmModal';

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function Sidebar({ title, subtitle, navGroups, user, portalInitial = 'S' }) {
  const { open, setOpen } = useSidebarStore();
  const pathname = usePathname();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setOpen(false); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <LogoutConfirmModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />

      <aside className={cn(
        'sidebar',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        !open && 'md:w-0 md:overflow-hidden md:border-0'
      )}>
        {/* Brand / Logo */}
        <div className="sidebar-brand">
          <div className="sidebar-logo-box">
            <Image
              src="/SKD-logo.png"
              alt="SKD Logo"
              width={36}
              height={36}
              className="object-contain w-full h-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              className="hidden w-full h-full items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}
            >
              {portalInitial}
            </div>
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="font-bold text-sm leading-tight truncate tracking-tight" style={{ color: '#0033a0' }}>
              {title || 'SKD Xpress'}
            </p>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium truncate">{subtitle}</p>}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="sidebar-section-label">{group.label}</p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.to || pathname.startsWith(item.to + '/');
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={cn('nav-item group', isActive && 'active')}
                  >
                    <div className={cn('nav-icon', isActive && 'active-icon')}>
                      <item.icon size={15} className="flex-shrink-0" />
                    </div>
                    <span className="truncate flex-1 text-[13px]">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">{item.badge}</span>
                    )}
                    {isActive && <div className="nav-active-bar" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer + Logout */}
        {user && (
          <div className="sidebar-footer">
            {/* User Info */}
            <Link 
              href={
                ['admin', 'super_admin', 'institute_admin', 'admin_acadops', 'admin_operations'].includes(user.role)
                  ? '/admin/profile'
                  : `/${user.role}/profile`
              } 
              className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors group block"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}
              >
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.firstName || user.name || 'U')?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-primary-700 transition-colors">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{user.role || 'Student'}</p>
              </div>
            </Link>

            {/* Logout button with text */}
            <button
              onClick={() => setShowLogout(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-all group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 group-hover:bg-red-100 transition-colors">
                <LogOut size={14} className="text-red-500" />
              </div>
              Log Out
            </button>
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
    <header className="topbar">
      <button
        onClick={toggle}
        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all flex-shrink-0"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 min-w-0">
        {breadcrumbs ? (
          <nav className="flex items-center gap-1 text-sm flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300 text-xs">/</span>}
                <span className={cn(
                  i === breadcrumbs.length - 1
                    ? 'font-semibold text-gray-800'
                    : 'text-gray-400'
                )}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="font-semibold text-gray-800 text-sm truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {actions}

        {user && (
          <div className="relative group">
            <button
              onClick={() => {
                if (onProfileClick) onProfileClick();
                else window.location.href = `/${user.role === 'admin' ? 'skd-admin' : user.role === 'skd-teacher' ? 'skd-teacher' : user.role}/profile`;
              }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
            >
              <div className="topbar-avatar overflow-hidden">
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.firstName || user.name || 'U')?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-tight">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50 overflow-hidden">
              <div className="p-1">
                <Link 
                  href={`/${user.role === 'admin' ? 'skd-admin' : user.role === 'skd-teacher' ? 'skd-teacher' : user.role}/profile`}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors"
                >
                  <User size={16} className="text-primary-500" /> My Profile
                </Link>
                <div className="h-px bg-gray-100 my-1 mx-2" />
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>
          </div>
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
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0.5 flex-wrap">
              {breadcrumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <span>{c}</span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-lg font-bold text-gray-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
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
    <div className="flex min-h-screen" style={{ background: '#f5f6fa' }}>
      {sidebar}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        open ? 'md:ml-[240px]' : 'md:ml-0'
      )}>
        {children}
      </div>
    </div>
  );
}
