"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, Users, BookOpen, Video, FileText, Settings, CreditCard, LayoutDashboard, Database, UserCheck, UserCircle, Briefcase, FileCheck, MessageSquare, Archive } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeveloperModeListener from '@/components/common/DeveloperModeListener';

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
        { icon: Settings, label: 'Settings', to: '/admin/settings' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { icon: BookOpen, label: 'Study Materials', to: '/admin/study-materials' },
        { icon: Video, label: 'Live Classes', to: '/admin/live-classes' },
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
        { icon: MessageSquare, label: 'Doubts Monitor', to: '/admin/doubts' },
        { icon: Archive, label: 'Recycle Bin', to: '/admin/recycle-bin' }
      ]
    }
  ];

  return (
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
  );
}
