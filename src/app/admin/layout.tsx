"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, Users, BookOpen, Video, FileText, Settings, CreditCard, LayoutDashboard, Database, UserCheck, UserCircle, Briefcase, FileCheck, MessageSquare, Archive, SlidersHorizontal, BookMarked, CalendarClock, UserRoundSearch, BellRing, CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeveloperModeListener from '@/components/common/DeveloperModeListener';
import { PortalAccessGuard } from '@/components/common/PortalAccessGuard';

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const navGroups = [
    {
      label: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', to: '/admin/dashboard' },
        { icon: Users, label: 'Students', to: '/admin/students' },
        { icon: UserCircle, label: 'Parents', to: '/admin/parents' },
        { icon: UserCheck, label: 'Teachers', to: '/admin/teachers' },
        { icon: BookOpen, label: 'Courses', to: '/admin/courses' },
        { icon: BookMarked, label: 'Subject Library', to: '/admin/subjects' },
        { icon: Settings, label: 'Settings', to: '/admin/settings' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { icon: BookOpen, label: 'Study Materials', to: '/admin/study-materials' },
        { icon: Video, label: 'Live Classes & Timetable', to: '/admin/live-classes' },
        { icon: CalendarCheck, label: 'Attendance', to: '/admin/attendance' },
      ]
    },
    {
      label: 'Examinations',
      items: [
        { icon: FileCheck, label: 'Exams & Results', to: '/admin/exams' },
        { icon: Database, label: 'Question Banks', to: '/admin/question-banks' },
      ]
    },
    {
      label: 'Management',
      items: [
        { icon: CreditCard, label: 'Fees & Payments', to: '/admin/fees' },
        { icon: UserRoundSearch, label: 'Leads', to: '/admin/leads' },
        { icon: BellRing, label: 'Announcements', to: '/admin/notifications' },
        { icon: CalendarClock, label: 'Mentor Sessions', to: '/admin/mentor-sessions' },
        { icon: SlidersHorizontal, label: 'Academic Operations', to: '/admin/operations' },
        { icon: MessageSquare, label: 'Doubts Monitor', to: '/admin/doubts' },
        { icon: Archive, label: 'Recycle Bin', to: '/admin/recycle-bin' }
      ]
    }
  ];

  return (
    <PortalAccessGuard allowedRoles={["admin"]}>
    <DashboardLayout sidebar={
      <Sidebar
        title="ARKE Scholars"
        subtitle="Admin Portal"
        portalInitial="A"
        navGroups={navGroups}
        user={user}
      />
    }>
      <Topbar title="ARKE Scholars | Admin" user={user} />
      <DeveloperModeListener />
      <main className="p-4 md:p-6">
        {children}
      </main>
    </DashboardLayout>
    </PortalAccessGuard>
  );
}
