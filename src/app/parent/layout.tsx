"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, Users, LineChart, CreditCard, Calendar, MessageSquare, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ParentLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const navGroups = [
    {
      label: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', to: '/parent/dashboard' },
        { icon: Users, label: 'My Children', to: '/parent/children' },
        { icon: CreditCard, label: 'Child Transactions', to: '/parent/transactions' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { icon: LineChart, label: 'Performance', to: '/parent/exams' },
      ]
    },
  ];

  return (
    <DashboardLayout sidebar={
      <Sidebar
        title="SKD Xpress"
        subtitle="Parent Portal"
        portalInitial="P"
        navGroups={navGroups}
        user={user}
      />
    }>
      <Topbar title="SKD Xpress | Parent" user={user} />
      <main className="p-4 md:p-6">
        {children}
      </main>
    </DashboardLayout>
  );
}
