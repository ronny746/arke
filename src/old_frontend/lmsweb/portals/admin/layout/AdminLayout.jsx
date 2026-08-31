import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, LayoutDashboard, GraduationCap, Users, UserRound, UserCog2, BookOpen, Shield, Bell as BellIcon, BarChart3, School, DollarSign, Package, CalendarDays, Settings, CalendarClock, FileCheck, ClipboardCheck, Video, MessageSquare, User, FileText, Library } from 'lucide-react';
import { Sidebar, Topbar, DashboardLayout } from '../../../components/layout/index.jsx';
import { useThemeStore, useAuthStore } from '../../../store/index.js';
import { Tooltip } from '../../../components/ui/index.jsx';
import toast from 'react-hot-toast';

const adminOpsNavGroups = [
  {
    label: '',
    items: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/academics', icon: BookOpen, label: 'Academic Setup' },
      { to: '/admin/students', icon: GraduationCap, label: 'Students' },
      { to: '/admin/teachers', icon: Users, label: 'Teachers' },
      { to: '/admin/parents', icon: UserRound, label: 'Parents' },
      { to: '/admin/fees', icon: DollarSign, label: 'Fees & Payments' },
      { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    ],
  },
  {
    label: 'Communication & Reports',
    items: [
      { to: '/admin/communication', icon: MessageSquare, label: 'Messages' },
      { to: '/admin/lead-management', icon: FileText, label: 'Lead Management' },
      { to: '/admin/forms', icon: FileText, label: 'Forms & Inquiries' },
      { to: '/admin/notifications', icon: BellIcon, label: 'Notifications' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/profile', icon: User, label: 'My Profile' },
    ],
  },
];

const adminAcadOpsNavGroups = [
  {
    label: '',
    items: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Academic Management',
    items: [
      { to: '/admin/academics', icon: BookOpen, label: 'Academic Setup' },
      { to: '/admin/teachers', icon: Users, label: 'Teachers' },
      { to: '/admin/students', icon: GraduationCap, label: 'Students' },
      { to: '/admin/timetable', icon: CalendarClock, label: 'Timetable' },
      { to: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance' },
      { to: '/admin/assignments', icon: FileCheck, label: 'Assignments & HW' },
      { to: '/admin/resources', icon: BookOpen, label: 'Resources' },
      { to: '/admin/question-banks', icon: Library, label: 'Question Banks' },
      { to: '/admin/exams', icon: FileCheck, label: 'Exams & Results' },
      { to: '/admin/live-classes', icon: Video, label: 'Live Classes' },
      { to: '/admin/ptm', icon: CalendarDays, label: 'PTM Booking' },
      { to: '/admin/communication', icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/profile', icon: User, label: 'My Profile' },
    ],
  },
];
const instituteOwnerNavGroups = [
  {
    label: '',
    items: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Operations & Staff',
    items: [
      { to: '/admin/staff', icon: UserCog2, label: 'Staff & Roles' },
      { to: '/admin/students', icon: GraduationCap, label: 'Students' },
      { to: '/admin/parents', icon: UserRound, label: 'Parents' },
      { to: '/admin/fees', icon: DollarSign, label: 'Fees & Payments' },
      { to: '/admin/inventory', icon: Package, label: 'Inventory' },
      { to: '/admin/ptm', icon: CalendarDays, label: 'PTM Booking' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: '/admin/academics', icon: BookOpen, label: 'Academic Setup' },
      { to: '/admin/teachers', icon: Users, label: 'Teachers' },
      { to: '/admin/timetable', icon: CalendarClock, label: 'Timetable' },
      { to: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance' },
      { to: '/admin/assignments', icon: FileCheck, label: 'Assignments & HW' },
      { to: '/admin/resources', icon: BookOpen, label: 'Resources' },
      { to: '/admin/question-banks', icon: Library, label: 'Question Banks' },
      { to: '/admin/exams', icon: FileCheck, label: 'Exams & Results' },
      { to: '/admin/live-classes', icon: Video, label: 'Live Classes' },
    ],
  },
  {
    label: 'Communication & Leads',
    items: [
      { to: '/admin/communication', icon: MessageSquare, label: 'Messages' },
      { to: '/admin/lead-management', icon: FileText, label: 'Lead Management' },
      { to: '/admin/forms', icon: FileText, label: 'Forms' },
      { to: '/admin/notifications', icon: BellIcon, label: 'Notifications' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Institute Settings' },
      { to: '/admin/profile', icon: User, label: 'My Profile' },
    ],
  },
];

export default function AdminLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Pick nav groups based on role
  const isAcadOps = user?.role === 'admin_acadops' || user?.role === 'admin-acadops';
  const isOwner = user?.role === 'super_admin' || user?.role === 'super_super_admin';
  const navGroups = isOwner ? instituteOwnerNavGroups : (isAcadOps ? adminAcadOpsNavGroups : adminOpsNavGroups);

  const sidebar = (
    <Sidebar
      logo={<School size={18} className="text-white" />}
      title={isOwner ? "Institute Owner Portal" : (isAcadOps ? "Academic Portal" : "Operations Portal")}
      subtitle={user?.instituteName || "Admin Management"}
      navGroups={navGroups}
      footerContent={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0] || 'A'}{user?.lastName?.[0] || 'D'}
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-800 dark:text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-surface-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={() => { 
              logout(); 
              localStorage.removeItem('token');
              toast.success('Logged out successfully'); 
              navigate('/'); 
            }} 
            className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-surface-400 hover:text-danger-500 transition-colors"
          >
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
      <Topbar title={isOwner ? "Institute Owner Admin" : (isAcadOps ? "Academic Admin" : "Operations Admin")} actions={topbarActions} user={{ name: `${user?.firstName || 'Admin'} ${user?.lastName || ''}`, role: user?.role?.replace('_', ' ') || 'Admin' }} />
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
