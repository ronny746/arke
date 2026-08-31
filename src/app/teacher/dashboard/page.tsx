"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Video, FileText, MessageSquare, CheckCircle, Plus, ArrowUpRight, BookOpen, Star, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import NeetCountdownCard from '@/components/NeetCountdownCard';

const statusStyle = {
  done:     { label: 'Done', color: '#059669', bg: '#ecfdf5' },
  ongoing:  { label: '🔴 Live', color: '#dc2626', bg: '#fef2f2' },
  upcoming: { label: 'Upcoming', color: '#6b7280', bg: '#f3f4f6' },
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    
    // Fetch real data
    const fetchDashboard = async () => {
      try {
        const { teacherAPI } = await import('@/api/teacher');
        const res = await teacherAPI.getDashboard();
        if (res.data?.success) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting} 🎓</p>
          <h1 className="text-2xl font-black text-gray-800 mt-0.5">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Teacher Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            You have {dashboardData?.upcomingClasses?.length || 0} classes scheduled today.
          </p>
        </div>
      </div>

      {/* NEET Countdown Card */}
      <NeetCountdownCard />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Students', value: dashboardData?.totalStudents || 0, change: 'Total assigned students', icon: Users, color: '#1a7a35', bg: '#ecfdf5' },
          { label: 'Classes Given', value: dashboardData?.totalClasses || 0, change: 'Total scheduled classes', icon: Video, color: '#0033a0', bg: '#eef2ff' },
          { label: 'Materials Uploaded', value: dashboardData?.materialsUploaded || 0, change: 'Total resources', icon: FileText, color: '#7b3fa0', bg: '#f5f3ff' },
          { label: 'Exams Conducted', value: dashboardData?.totalExams || 0, change: 'Total assigned exams', icon: BookOpen, color: '#e8470a', bg: '#fff7ed' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all group"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <ArrowUpRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-800">{stat.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-[11px] mt-2 font-medium" style={{ color: stat.color }}>{stat.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Schedule + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Today's Schedule</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <Clock size={14} className="text-gray-400" />
          </div>
          <div className="space-y-3 mt-6">
            {(dashboardData?.upcomingClasses || []).map((cls: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                <div className="min-w-[80px]">
                  <p className="text-sm font-bold text-gray-700">{cls.time}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">{cls.subject}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{cls.batch}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                    {cls.status}
                  </span>
                </div>
              </div>
            ))}
            {(!dashboardData?.upcomingClasses || dashboardData.upcomingClasses.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No classes scheduled for today.</p>
            )}
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Top Students</h2>
            <Star size={14} className="text-yellow-400" />
          </div>
          <div className="space-y-4">
            {(dashboardData?.topStudents || []).map((student: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-xs font-bold text-surface-600">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.subject}</p>
                </div>
                <p className="text-sm font-bold text-primary">{student.score}%</p>
              </div>
            ))}
            {(!dashboardData?.topStudents || dashboardData.topStudents.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No top students found.</p>
            )}
          </div>
          <button
            onClick={() => router.push('/teacher/students')}
            className="w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: '#ecfdf5', color: '#1a7a35' }}
          >
            View All Students →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <h2 className="font-bold text-gray-800 text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Upload Material', icon: BookOpen, color: '#0033a0', bg: '#eef2ff', to: '/teacher/study-materials' },
            { label: 'Create Exam', icon: CheckCircle, color: '#7b3fa0', bg: '#f5f3ff', to: '/teacher/exams' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => router.push(action.to)}
              className="flex items-center gap-2.5 p-3.5 rounded-xl hover:scale-105 transition-all active:scale-95"
              style={{ background: action.bg }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: action.color + '20' }}>
                <action.icon size={15} style={{ color: action.color }} />
              </div>
              <span className="text-xs font-bold text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
