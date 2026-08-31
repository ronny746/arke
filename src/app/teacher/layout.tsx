"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, FileCheck, Video, Users, BookOpen, PenTool, LayoutList, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

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
      ]
    },
    {
      label: 'Academics',
      items: [
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
    <DashboardLayout sidebar={
      <Sidebar
        title="SKD Xpress"
        subtitle="Teacher Portal"
        portalInitial="T"
        navGroups={navGroups}
        user={user}
      />
    }>
      <Topbar title="SKD Xpress | Teacher" user={user} />
      <main className="p-4 md:p-6">
        {children}
      </main>
    </DashboardLayout>
  );
}
