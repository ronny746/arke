"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, Video, FileCheck, Database, TrendingUp, Plus, ArrowUpRight, BookOpen, Calendar, Bell, BarChart2, Activity, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminAPI } from '@/api/admin';

const quickActions = [
  { label: 'Add Student', icon: Plus, color: '#0033a0', bg: '#eef2ff', to: '/admin/students' },
  { label: 'Add Teacher', icon: GraduationCap, color: '#059669', bg: '#ecfdf5', to: '/admin/teachers' },
  { label: 'Create Exam', icon: FileCheck, color: '#7b3fa0', bg: '#f5f3ff', to: '/admin/exams' },
  { label: 'Question Bank', icon: Database, color: '#e8470a', bg: '#fff7ed', to: '/admin/question-banks' },
  { label: 'Manage Courses', icon: BookOpen, color: '#0284c7', bg: '#eff6ff', to: '/admin/courses' },
  { label: 'Study Materials', icon: FileText, color: '#d97706', bg: '#fffbeb', to: '/admin/study-materials' },
];

const typeColor = { student: '#0033a0', material: '#059669', exam: '#7b3fa0', live: '#e8470a', fee: '#d97706' };
const typeBg = { student: '#eef2ff', material: '#ecfdf5', exam: '#f5f3ff', live: '#fff7ed', fee: '#fffbeb' };

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    const fetchData = async () => {
      try {
        const res = await adminAPI.getDashboardData();
        if (res.data?.success) {
          setDashboardData(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Students', value: dashboardData?.overview?.totalStudents?.toString() || '0', change: 'Total Registered', icon: Users, color: '#0033a0', bg: '#eef2ff', to: '/admin/students' },
    { label: 'Active Teachers', value: dashboardData?.overview?.totalTeachers?.toString() || '0', change: 'Total Registered', icon: GraduationCap, color: '#059669', bg: '#ecfdf5', to: '/admin/teachers' },
    { label: 'Live Classes Today', value: dashboardData?.overview?.activeClassesToday?.toString() || '0', change: 'Ongoing', icon: Video, color: '#7b3fa0', bg: '#f5f3ff', to: '/admin/live-classes' },
    { label: 'Exams Conducted', value: dashboardData?.overview?.totalExams?.toString() || '0', change: 'Total Created', icon: FileCheck, color: '#e8470a', bg: '#fff7ed', to: '/admin/exams' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const getActivityRoute = (type: string) => {
    switch (type) {
      case 'student': return '/admin/students';
      case 'exam': return '/admin/exams';
      case 'material': return '/admin/study-materials';
      case 'live': return '/admin/live-classes';
      case 'fee': return '/admin/fees';
      default: return '/admin/students';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-black text-gray-800 mt-0.5">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening at ARKE Scholars today.</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => stat.to && router.push(stat.to)}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: stat.bg }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                <ArrowUpRight size={14} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">{stat.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-[11px] mt-2 font-medium flex items-center gap-1" style={{ color: stat.color }}>
              <span>{stat.change}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] underline">View →</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Quick Actions</h2>
            <Activity size={14} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                onClick={() => router.push(action.to)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:scale-105 transition-all active:scale-95 text-left cursor-pointer"
                style={{ background: action.bg }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: action.color + '20' }}>
                  <action.icon size={16} style={{ color: action.color }} />
                </div>
                <span className="text-[11px] font-bold text-gray-600 text-center leading-tight">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Recent Activity</h2>
            <Bell size={14} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {(dashboardData?.recentActivity || []).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No recent activity found.</p>
            ) : (
              (dashboardData?.recentActivity || []).map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.1 }}
                  onClick={() => router.push(getActivityRoute(item.type))}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: typeColor[item.type as keyof typeof typeColor] || '#0033a0' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed group-hover:text-blue-600 transition-colors">{item.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{item.time}</p>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Batch Performance Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Average scores across active batches this month</p>
          </div>
          <button 
            onClick={() => router.push('/admin/courses')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span>Manage Courses</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {(dashboardData?.batchPerformance || []).length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No batch performance data available yet.</p>
          ) : (
            (dashboardData?.batchPerformance || []).map((b: any, i: number) => (
              <div 
                key={i} 
                onClick={() => router.push('/admin/courses')}
                className="flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="w-40 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-600 transition-colors">{b.batch}</p>
                  <p className="text-[10px] text-gray-400">{b.students} students</p>
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.avg}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 w-8 text-right">{b.avg}%</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
