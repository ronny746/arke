import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, LayoutDashboard, BookOpen, Users, Calendar, FileText, FolderOpen, ClipboardList, MessageSquare, HelpCircle, User, Video } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: '',
    items: [{ to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Teaching',
    items: [
      { to: '/teacher/classes', icon: BookOpen, label: 'My Classes' },
      { to: '/teacher/students', icon: Users, label: 'Student Roster' },
      { to: '/teacher/attendance', icon: Calendar, label: 'Attendance' },
      { to: '/teacher/assignments', icon: FileText, label: 'Assignments', badge: '3' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/teacher/resources', icon: FolderOpen, label: 'Resources' },
      { to: '/teacher/exams', icon: ClipboardList, label: 'Exam Management' },
    ],
  },
  {
    label: 'Engage',
    items: [
      { to: '/teacher/live-classes', icon: Video, label: 'Live Classes' },
      { to: '/teacher/communication', icon: MessageSquare, label: 'Communication', badge: '5' },
      { to: '/teacher/doubts', icon: HelpCircle, label: 'Doubt Sessions' },
      { to: '/teacher/ptm', icon: Calendar, label: 'PTM Booking' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/teacher/profile', icon: User, label: 'My Profile' },
    ],
  },
];

export default function TeacherLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const sidebar = (
    <Sidebar
      logo="T"
      title="Teacher Portal"

      subtitle={user?.instituteName || "Sunrise Academy"}
      navGroups={navGroups}
      footerContent={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success to-accent flex items-center justify-center text-white text-xs font-bold uppercase">
              {user?.firstName?.charAt(0) || 'T'}{user?.lastName?.charAt(0) || ''}
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-800 dark:text-white leading-tight">
                {user?.firstName || 'Teacher'} {user?.lastName || ''}
              </p>
              <p className="text-xs text-surface-400 capitalize">{user?.role || 'Teacher'}</p>
            </div>
          </div>
          <button onClick={() => { toast.success('Logged out successfully'); navigate('/'); }} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-surface-400 hover:text-danger-500 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      }
    />
  );

  const topbarActions = (
    <div className="flex items-center gap-1">
      <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button className="relative p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
      </button>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <Topbar title="Teacher" actions={topbarActions} user={{ name: `${user?.firstName || 'Teacher'} ${user?.lastName || ''}`, role: user?.role || 'Teacher' }} />
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
