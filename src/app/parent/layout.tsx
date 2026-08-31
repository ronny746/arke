"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, Users, BookOpen, LineChart, MessageSquare, CreditCard, Calendar, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ParentLayout({ children }) {
  const router = useRouter();

  const navigation = [
    {
      label: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', to: '/parent/dashboard' },
        { icon: Users, label: 'My Children', to: '/parent/exams' },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const footer = (
    <div className="flex justify-end p-2">
      <button
        onClick={handleLogout}
        className="p-1.5 text-surface-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  );

  return (
    <DashboardLayout
      sidebar={
        <Sidebar 
          title="Parent Portal"
          navGroups={navigation}
          footerContent={footer}
        />
      }
    >
      <div className="flex-1 flex flex-col min-w-0 bg-surface-50 dark:bg-surface-950">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
