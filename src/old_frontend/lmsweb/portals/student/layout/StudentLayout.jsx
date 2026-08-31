import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, LayoutDashboard, Calendar, BookOpen, Video, Award, UserPlus, MessageSquare, User, FileText } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: '',
    items: [{ to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Academics',
    items: [
      { to: '/student/schedule', icon: Calendar, label: 'My Schedule' },
      { to: '/student/academics', icon: BookOpen, label: 'Homework & Assignments' },
      { to: '/student/live-classes', icon: Video, label: 'Live Classes' },
      { to: '/student/exams', icon: FileText, label: 'Online Exams' },
      { to: '/student/resources', icon: BookOpen, label: 'Study Materials' },
      { to: '/student/results', icon: Award, label: 'Results' },
      { to: '/student/messages', icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/student/parent-setup', icon: UserPlus, label: 'Parent Setup' },
      { to: '/student/profile', icon: User, label: 'My Profile' },
    ],
  },
];

export default function StudentLayout() {
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
          {user?.firstName?.charAt(0) || 'S'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-surface-900 dark:text-white">
            {user?.firstName || 'Student'}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">Student</p>
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
      title="Student Portal"
      subtitle={user?.instituteName || "Student Dashboard"}
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
