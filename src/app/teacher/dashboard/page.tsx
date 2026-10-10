"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Video, FileText, ArrowUpRight, BookOpen, Clock, 
  GraduationCap, Radio, CalendarDays, CheckCircle, MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { teacherAPI } from '@/api/teacher';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    
    // Fetch dashboard and live classes
    const fetchDashboard = async () => {
      try {
        const [res, liveRes] = await Promise.all([
          teacherAPI.getDashboard(),
          teacherAPI.getLiveClasses()
        ]);
        if (res.data?.success) {
          setDashboardData(res.data.data);
        }
        setActiveClasses((liveRes.data?.data || []).filter((item: any) => item.status === 'ONGOING'));
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
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-3 border-[#1a7a35] border-t-transparent rounded-full" />
      </div>
    );
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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/teacher/live-classes')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a7a35] text-white text-xs font-bold shadow-sm hover:bg-[#15632b] transition-all"
          >
            <Video size={15} /> Live Classes & Timetable
          </button>
        </div>
      </div>

      {/* Live Class Alert */}
      {activeClasses.length > 0 && (() => {
        const liveClass = activeClasses[0];
        const schedule = liveClass.classScheduleId || {};
        const joinUrl = liveClass.startUrl || liveClass.meetingLink;
        return (
          <section className="animate-pulse rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-700 p-1 shadow-lg shadow-emerald-800/20 motion-reduce:animate-none">
            <div className="flex flex-col gap-3 rounded-[0.9rem] bg-[#063d35]/95 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-[#063d35]">
                  <Radio size={19} />
                </span>
                <div>
                  <p className="text-[10px] font-black tracking-[0.12em] text-emerald-200">YOUR CLASS IS LIVE</p>
                  <h2 className="mt-0.5 font-black">{schedule.subjectId?.name || 'Live class'} · {schedule.batchId?.name || 'Batch'}</h2>
                  <p className="mt-0.5 text-xs text-emerald-50/80">Students can join now. Reopen Zoom or end the session from Live Classes.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => joinUrl && window.open(joinUrl, '_blank', 'noopener,noreferrer')} 
                className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-[#0B132B] shadow-sm transition-transform hover:scale-[1.02]"
              >
                Rejoin live class
              </button>
            </div>
          </section>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Students', value: dashboardData?.totalStudents || 0, change: 'Total assigned students', icon: Users, color: '#1a7a35', bg: '#ecfdf5', to: '/teacher/students' },
          { label: 'Classes Given', value: dashboardData?.totalClasses || 0, change: 'Total scheduled classes', icon: Video, color: '#0033a0', bg: '#eef2ff', to: '/teacher/live-classes' },
          { label: 'Materials Uploaded', value: dashboardData?.materialsUploaded || 0, change: 'Total resources', icon: FileText, color: '#7b3fa0', bg: '#f5f3ff', to: '/teacher/study-materials' },
          { label: 'Exams Conducted', value: dashboardData?.totalExams || 0, change: 'Total assigned exams', icon: BookOpen, color: '#e8470a', bg: '#fff7ed', to: '/teacher/exams' },
        ].map((stat, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => router.push(stat.to)}
            aria-label={`Open ${stat.label}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a35] focus-visible:ring-offset-2"
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
          </motion.button>
        ))}
      </div>

      {/* My Courses & Batches */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">My Courses & Batches</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Courses and learners assigned to you by the admin.</p>
          </div>
          <button 
            onClick={() => router.push('/teacher/live-classes')} 
            className="text-xs font-bold text-[#1a7a35] hover:underline"
          >
            Open Live Classes & Timetable →
          </button>
        </div>
        {(dashboardData?.assignedBatches || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {dashboardData.assignedBatches.map((batch: any) => (
              <button 
                key={batch._id} 
                onClick={() => router.push(`/teacher/live-classes?batchId=${batch._id}`)} 
                className="text-left rounded-xl border border-gray-100 bg-[#f8fafc] p-4 hover:border-[#1a7a35]/40 hover:bg-[#ecfdf5] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#1a7a35] transition-colors">{batch.courseName}</p>
                    <p className="text-xs text-gray-500 mt-1">{batch.name}{batch.section ? ` · ${batch.section}` : ''}</p>
                  </div>
                  <GraduationCap size={18} className="text-[#1a7a35] shrink-0" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1a7a35]">
                    {batch.studentCount} assigned {batch.studentCount === 1 ? 'student' : 'students'}
                  </span>
                  <span className="text-[11px] font-bold text-gray-400 group-hover:text-[#1a7a35]">
                    View Classes →
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
            No course or batch is assigned to you yet. Ask an admin to assign you to a batch.
          </div>
        )}
      </section>

      {/* Today's Schedule + Assigned students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Today's Schedule</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <button
              onClick={() => router.push('/teacher/live-classes')}
              className="text-xs font-bold text-[#1a7a35] hover:underline flex items-center gap-1"
            >
              <Clock size={13} /> View Live Classes →
            </button>
          </div>
          <div className="space-y-3 mt-4">
            {(dashboardData?.upcomingClasses || []).map((cls: any, i: number) => (
              <div 
                key={i} 
                onClick={() => router.push('/teacher/live-classes')}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group cursor-pointer"
              >
                <div className="min-w-[85px]">
                  <p className="text-sm font-bold text-gray-700">{cls.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-[#1a7a35] transition-colors truncate">{cls.subject}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{cls.batch}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {cls.status}
                  </span>
                </div>
              </div>
            ))}
            {(!dashboardData?.upcomingClasses || dashboardData.upcomingClasses.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                No classes scheduled for today.
              </p>
            )}
          </div>
        </div>

        {/* Assigned students */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Assigned Students</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Learners under your purview</p>
            </div>
            <button
              onClick={() => router.push('/teacher/students')}
              className="text-xs font-bold text-[#1a7a35] hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {(dashboardData?.assignedStudents || []).map((student: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ecfdf5] flex items-center justify-center text-xs font-bold text-[#1a7a35]">
                  {(student.firstName || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{student.firstName} {student.lastName || ''}</p>
                  <p className="text-xs text-gray-500 truncate">{student.rollNo || 'Roll number pending'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {(!dashboardData?.assignedStudents || dashboardData.assignedStudents.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No students in your assigned batches yet.</p>
            )}
          </div>
          <button
            onClick={() => router.push('/teacher/students')}
            className="w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: '#ecfdf5', color: '#1a7a35' }}
          >
            View All Students →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="font-bold text-gray-800 text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Live Classes', icon: Video, color: '#1a7a35', bg: '#ecfdf5', to: '/teacher/live-classes' },
            { label: 'Student Doubts', icon: MessageSquare, color: '#0033a0', bg: '#eef2ff', to: '/teacher/doubts' },
            { label: 'Upload Material', icon: BookOpen, color: '#7b3fa0', bg: '#f5f3ff', to: '/teacher/study-materials' },
            { label: 'Create Exam', icon: CheckCircle, color: '#e8470a', bg: '#fff7ed', to: '/teacher/exams' },
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
