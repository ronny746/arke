import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, LayoutDashboard, Users, BookOpen, Calendar, CreditCard, MessageSquare, User } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: '',
    items: [{ to: '/parent/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/parent/academics', icon: BookOpen, label: 'Academics & Attendance' },
      { to: '/parent/assignments', icon: BookOpen, label: 'Assignments' },
      { to: '/parent/exams', icon: BookOpen, label: 'Exams & Results' },
      { to: '/parent/live-classes', icon: BookOpen, label: 'Live Classes' },
      { to: '/parent/ptm', icon: Calendar, label: 'PTM Booking' },
      { to: '/parent/messages', icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/parent/fees', icon: CreditCard, label: 'Fees & Payments' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/parent/profile', icon: User, label: 'My Profile' },
    ],
  },
];

export default function ParentLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const topbarActions = (
    <div className="flex items-center gap-2">
      <button 
        onClick={toggleTheme}
        className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <button className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-white dark:border-surface-900" />
      </button>
      <div className="h-6 w-px bg-surface-200 dark:bg-surface-700 mx-2" />
      <div className="flex items-center gap-3 pl-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
          {user?.firstName?.charAt(0) || 'P'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-surface-900 dark:text-white">
            {user?.firstName || 'Parent'}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">Parent / Guardian</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-surface-500 hover:text-danger rounded-full hover:bg-danger/10 transition-colors ml-2"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const sidebar = (
    <Sidebar 
      logo="LMS Platform" 
      navGroups={navGroups}
      title="Parent Portal"
      subtitle={user?.instituteName || "Parent Dashboard"}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <Topbar actions={topbarActions} />
      <main className="flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-900/50 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
