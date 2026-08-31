import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, Settings, LogOut, LayoutDashboard, Building2, GitBranch, CreditCard, Users, Sliders, ClipboardList, Shield, Database } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import { Tooltip } from '../../../components/ui/index.jsx';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: '',
    items: [
      { to: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/super-admin/institutes', icon: Building2, label: 'Institutes' },
      { to: '/super-admin/users', icon: Users, label: 'Users' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/super-admin/settings', icon: Sliders, label: 'Platform Settings' },
      { to: '/super-admin/integrations', icon: GitBranch, label: 'Integrations' },
      { to: '/super-admin/backups', icon: Database, label: 'Database Backups' },
      { to: '/super-admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
    ],
  },
];

export default function SuperAdminLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const sidebar = (
    <Sidebar
      logo={<Shield size={18} className="text-white" />}
      title="Super Admin"
      subtitle="LMS Platform"
      navGroups={navGroups}
      footerContent={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">SA</div>
            <div>
              <p className="text-xs font-semibold text-surface-800 dark:text-white leading-tight">Super Admin</p>
              <p className="text-xs text-surface-400">Platform Manager</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-surface-400 hover:text-danger-500 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      }
    />
  );

  const topbarActions = (
    <div className="flex items-center gap-1">
      <Tooltip text={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
        <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </Tooltip>
      <button className="relative p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
      </button>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <Topbar
        title="Super Admin"
        actions={topbarActions}
        user={{ name: `${user?.firstName || 'Super'} ${user?.lastName || 'Admin'}`, role: 'Platform Manager' }}
      />
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
