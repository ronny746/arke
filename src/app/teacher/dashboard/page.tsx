"use client";

import { useState, useEffect } from 'react';
import { Users, Video, Calendar, Clock, BookOpen, User } from 'lucide-react';
import { Card } from '@/components/ui/index.jsx';
import { PageHeader } from '@/components/layout/index.jsx';

export default function TeacherDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const stats = [
    { title: 'My Classes', value: '3', icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { title: 'Live Sessions', value: '5', icon: Video, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
    { title: 'Total Students', value: '120', icon: Users, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-surface-800 p-6 rounded-2xl shadow-sm border border-surface-100 dark:border-surface-700">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Welcome back, {user?.firstName || 'Teacher'}! 👋
          </h1>
          <p className="text-surface-500 mt-1">Here's what's happening in your classes today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-surface-900 dark:text-white mt-1">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Today's Schedule
          </h3>
          <div className="text-center p-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
            <Clock className="w-12 h-12 text-surface-400 mx-auto mb-3" />
            <p className="text-surface-600 font-medium">No classes scheduled for today.</p>
            <p className="text-surface-500 text-sm mt-1">Check your timetable for upcoming sessions.</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-success-500" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4 p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
               <div className="w-2 h-2 mt-2 rounded-full bg-primary-500"></div>
               <div>
                 <p className="font-medium">Welcome to the Teacher Portal!</p>
                 <p className="text-sm text-surface-500">You can manage your Live Classes from the sidebar.</p>
               </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
