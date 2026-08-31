"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Video, FileCheck, Play, LayoutList, PenTool, ChevronRight, Clock, Star, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { studentAPI } from '@/api/index.js';

import NeetCountdownCard from '@/components/NeetCountdownCard';
import StudentPerformanceCard from '@/components/StudentPerformanceCard';
import { BannerCarousel } from '@/components/BannerCarousel';

const getLiveClassRoomCode = (liveClass: any) => {
  if (typeof liveClass?.roomCode === 'string' && liveClass.roomCode.trim()) {
    return liveClass.roomCode.trim().toUpperCase();
  }

  const primaryUrl = liveClass?.meetingLink || liveClass?.startUrl;
  if (!primaryUrl || !primaryUrl.includes('/class/')) return null;

  const roomCode = primaryUrl.split('/class/')[1]?.split(/[?#]/)[0];
  return roomCode ? roomCode.toUpperCase() : null;
};

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [batches, setBatches] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);
  const [unenrolledCourses, setUnenrolledCourses] = useState([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let parsedUser: any = null;
    const stored = localStorage.getItem('user');
    if (stored) {
      parsedUser = JSON.parse(stored);
      setUser(parsedUser);
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const enrolledCourseIds = new Set<string>();
        const enrolledCourseNames = new Set<string>();

        try {
          const batchesRes = await studentAPI.getMyBatches();
          const batchList = Array.isArray(batchesRes.data)
            ? batchesRes.data
            : (batchesRes.data?.data || []);

          if (batchList) {
            setBatches(batchList);
            for (const b of batchList) {
              const cId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
              if (cId) enrolledCourseIds.add(cId.toString());
              if (b._id) enrolledCourseIds.add(b._id.toString());
              if (b.id) enrolledCourseIds.add(b.id.toString());

              const cName = typeof b.courseId === 'object' ? b.courseId?.name : (b.courseName || b.name);
              if (cName) enrolledCourseNames.add(cName.toString().trim().toLowerCase());
            }
          }
        } catch (err) {
          console.error("Failed to fetch batches", err);
        }

        try {
          const uInstId = parsedUser?.instituteId || parsedUser?.institute?._id || '';
          const url = '/api/v1/public/courses' + (uInstId ? `?instituteId=${uInstId}` : '');
          const coursesRes = await fetch(url).then(r => r.json());
          if (coursesRes.success) {
            const seenIds = new Set<string>();
            const seenNames = new Set<string>();
            const available: any[] = [];

            for (const c of (coursesRes.data || [])) {
              const cId = c._id?.toString() || c.id?.toString();
              const cName = (c.name || '').toString().trim().toLowerCase();

              const isEnrolled = (cId && enrolledCourseIds.has(cId)) || (cName && enrolledCourseNames.has(cName));
              if (isEnrolled) continue;

              if ((cId && seenIds.has(cId)) || (cName && seenNames.has(cName))) continue;

              if (cId) seenIds.add(cId);
              if (cName) seenNames.add(cName);
              available.push(c);
            }

            setUnenrolledCourses(available);
          }
        } catch (err) {
          console.error("Failed to fetch public courses", err);
        }

        // Fetch live classes separately (might be restricted by plan)
        try {
          const liveClassesRes = await studentAPI.getLiveClasses();
          const ongoing = (liveClassesRes.data?.data || []).filter((c: any) => c.status === 'ONGOING');
          setActiveClasses(ongoing);
        } catch (err) {
          console.error("Live classes restricted or failed to fetch");
          setActiveClasses([]);
        }

      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleJoinAutoClass = (liveClass: any) => {
    const roomCode = getLiveClassRoomCode(liveClass);
    if (!roomCode) {
      toast.error('Unable to find the live classroom link.');
      return;
    }

    router.push(`/class/${roomCode}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy via-[#1C2541] to-navy p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <BookOpen size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </h1>
          <p className="text-amber-200/90 text-lg max-w-2xl">
            Ready to continue your learning journey? Jump right into your enrolled courses and pick up where you left off.
          </p>
        </div>
      </header>

      {/* Promotional Banners Carousel */}
      <BannerCarousel />

      {/* Student Performance Card */}
      <StudentPerformanceCard />

      {/* NEET Countdown Card */}
      <NeetCountdownCard />

      {/* Live Now Banner (Only if there are active classes) */}
      {!loading && activeClasses.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-red-500/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center animate-pulse">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Live Classes Ongoing!</h3>
              <p className="text-red-600/80 dark:text-red-300/80 text-sm">Join your session right now before it ends.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeClasses.map(ac => (
              <button 
                key={ac._id}
                onClick={() => handleJoinAutoClass(ac)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Play size={18} fill="currentColor" />
                Join {ac.classScheduleId?.subjectId?.name || 'Class'}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Available Courses */}
      {!loading && unenrolledCourses.length > 0 && (
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Available Courses</h2>
              <p className="text-surface-500">Discover and enroll in new courses to boost your preparation.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {unenrolledCourses.filter((plan: any) => {
              if (!courseSearchQuery.trim()) return true;
              const q = courseSearchQuery.trim().toLowerCase();
              return (
                (plan.name || '').toLowerCase().includes(q) ||
                (plan.subtitle || '').toLowerCase().includes(q) ||
                (plan.description || '').toLowerCase().includes(q) ||
                (plan.tag || '').toLowerCase().includes(q) ||
                String(plan.fee || '').includes(q)
              );
            }).map((plan: any, i: number) => {
              const colors = ["#0033a0", "#e8470a", "#7b3fa0"];
              const planColor = plan.color || colors[i % colors.length];
              
              return (
                <motion.div key={plan._id}
                  variants={itemVariants}
                  whileHover={{ y: -8, boxShadow: `0 24px 48px ${planColor}25` }}
                  className="flex flex-col rounded-2xl overflow-hidden border-2 bg-white transition-all duration-300"
                  style={{ borderColor: plan.popular ? planColor : "#e5e7eb", boxShadow: plan.popular ? `0 12px 40px ${planColor}20` : undefined }}>

                  {/* Card Header */}
                  <div className="px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}cc 100%)` }}>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white/60 text-xs font-black uppercase tracking-widest">Available</span>
                      {plan.tag && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>
                          {plan.tag}
                        </span>
                      )}
                      {plan.badge && (
                        <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-xl leading-tight mb-1 line-clamp-2">{plan.name}</h3>
                    <p className="text-white/75 text-sm line-clamp-1">{plan.subtitle || plan.description || "Comprehensive preparation package."}</p>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col p-6">
                    {/* What's Included */}
                    <div className="mb-5">
                      <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: planColor }}>
                        <FileCheck className="w-3.5 h-3.5" /> What&apos;s Included
                      </p>
                      <ul className="space-y-2">
                        {(plan.features || ["Live Classes", "Study Materials", "DPPs", "Test Series"]).map((f: string, fi: number) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-1 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center" style={{ background: `${planColor}18` }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: planColor }} />
                            </span>
                            <span className="text-gray-700 leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Enroll Button */}
                    <div className="mt-auto pt-6">
                      <button onClick={() => router.push(`/student/course/${plan._id}`)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${planColor}, ${planColor}bb)`, color: "white", boxShadow: `0 6px 20px ${planColor}35` }}>
                        View Details & Enroll <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Course Fee Footer */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ background: `${planColor}08`, borderTop: `2px solid ${planColor}20` }}>
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: planColor }}>Course Fee</span>
                    <div className="flex items-center gap-2">
                      {plan.actualFee && (
                        <span className="text-sm font-bold line-through opacity-60" style={{ color: planColor }}>₹{plan.actualFee?.toLocaleString()}</span>
                      )}
                      <span className="text-2xl font-black" style={{ color: planColor }}>₹{plan.fee?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}
