"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, FileCheck, Video, Users, BookOpen, PenTool, LayoutList, MessageSquare, LineChart, Sparkles, CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PortalAccessGuard } from '@/components/common/PortalAccessGuard';

export default function TeacherLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const navGroups = [
    {
      label: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', to: '/teacher/dashboard' },
        { icon: Users, label: 'My Students', to: '/teacher/students' },
        { icon: LineChart, label: 'Topic Analysis', to: '/teacher/flags' },
        { icon: CalendarCheck, label: 'Attendance & Leave', to: '/teacher/attendance' },
      ]
    },
    {
      label: 'Academics & Practice',
      items: [
        { icon: Sparkles, label: 'Daily Practice (DPP)', to: '/teacher/flags?tab=dpps' },
        { icon: BookOpen, label: 'Study Materials', to: '/teacher/study-materials' },
        { icon: Video, label: 'Live Classes', to: '/teacher/live-classes' },
        { icon: MessageSquare, label: 'Student Doubts', to: '/teacher/doubts' },
      ]
    },
    {
      label: 'Examinations',
      items: [
        { icon: FileCheck, label: 'Exams & Results', to: '/teacher/exams' },
      ]
    }
  ];

  return (
    <PortalAccessGuard allowedRoles={["teacher"]}>
    <DashboardLayout sidebar={
      <Sidebar
        title="ARKE Scholars"
        subtitle="Teacher Portal"
        portalInitial="T"
        navGroups={navGroups}
        user={user}
      />
    }>
      <Topbar title="ARKE Scholars | Teacher" user={user} />
      <main className="p-4 md:p-6">
        {children}
      </main>
    </DashboardLayout>
    </PortalAccessGuard>
  );
}
