import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: '',
    items: [{ to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Lead Management',
    items: [
      { to: '/staff/my-leads', icon: Users, label: 'My Leads' },
      { to: '/staff/pool', icon: UserPlus, label: 'Lead Pool' },
    ],
  },
];

export default function StaffLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const topbarActions = (
    <>
      <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors relative">
        <Bell size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-surface-900" />
      </button>
      <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-danger/10 text-danger transition-colors" title="Logout">
        <LogOut size={20} />
      </button>
    </>
  );

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          title="LMS Staff Portal"
          subtitle={user?.metadata?.designation || 'Staff'}
          navGroups={navGroups}
          accentColor="primary"
        />
      }
    >
      <Topbar
        title="LMS Staff Portal"
        actions={topbarActions}
        user={{
          name: user ? `${user.firstName} ${user.lastName}` : 'Staff',
          role: user?.metadata?.designation || 'Staff Member'
        }}
        onProfileClick={() => {}}
      />
      
      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
