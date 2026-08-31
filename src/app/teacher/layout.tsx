"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, FileCheck, Video, Users, LogOut, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TeacherLayout({ children }) {
  const router = useRouter();
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
        { icon: Users, label: 'Students', to: '/teacher/students' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { icon: BookOpen, label: 'Study Materials', to: '/teacher/study-materials' },
        { icon: Video, label: 'Live Classes', to: '/teacher/live-classes' },
      ]
    },
    {
      label: 'Examinations',
      items: [
        { icon: FileCheck, label: 'Exams & Results', to: '/teacher/exams' },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const footer = user ? (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {(user.firstName || user.name || 'T')?.charAt(0)?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-800 dark:text-white truncate">
          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name}
        </p>
        <p className="text-[10px] text-surface-400 capitalize">{user.role}</p>
      </div>
      <button
        onClick={handleLogout}
        className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-surface-400 hover:text-danger-500 transition-colors flex-shrink-0"
        title="Logout"
      >
        <LogOut size={14} />
      </button>
    </div>
  ) : null;

  return (
    <DashboardLayout sidebar={
      <Sidebar
        title="Teacher Portal"
        subtitle="Learning Management"
        navGroups={navGroups}
        footerContent={footer}
      />
    }>
      <Topbar title="Teacher Portal" user={user} />
      <main className="p-4 md:p-6">
        {children}
      </main>
    </DashboardLayout>
  );
}
