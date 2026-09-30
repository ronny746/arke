"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  LayoutList, 
  BookOpen, 
  Video, 
  PenTool, 
  FileCheck, 
  Star, 
  ChevronRight, 
  TrendingUp, 
  Compass, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  SlidersHorizontal 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { studentAPI } from "@/api/index.js";

export default function MyBatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'ENROLLED' | 'EXPLORE'>('ENROLLED');
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('RECOMMENDED');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
      } catch (e) {}
    }
  }, []);

  // Fetch Enrolled Batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await studentAPI.getMyBatches();
        if (res.data?.success) {
          setBatches(res.data.data || []);
        } else {
          toast.error(res.data?.message || "Failed to load batches");
        }
      } catch (err) {
        toast.error("Network error fetching batches");
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  // Fetch Public Available Courses for Explore
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const stored = localStorage.getItem('user');
        const parsedUser = stored ? JSON.parse(stored) : null;
        const query = new URLSearchParams();
        const instituteId = parsedUser?.instituteId || parsedUser?.institute?._id;
        if (instituteId) query.set('instituteId', instituteId);
        if (parsedUser?.metadata?.targetExam) {
          query.set('targetExam', parsedUser.metadata.targetExam);
          query.set('strictGoal', 'true');
        }
        const res = await fetch(`/api/v1/public/courses${query.size ? `?${query}` : ''}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableCourses(data.data);
        }
      } catch (err) {
        console.error("Failed to load available courses", err);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Enrolled course IDs set for quick lookup
  const enrolledCourseIds = new Set<string>();
  const enrolledCourseNames = new Set<string>();
  batches.forEach((b: any) => {
    const cId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
    if (cId) enrolledCourseIds.add(cId.toString());
    if (b._id) enrolledCourseIds.add(b._id.toString());
    const courseName = typeof b.courseId === 'object' ? b.courseId?.name : (b.courseName || b.name);
    if (courseName) enrolledCourseNames.add(courseName.toString().trim().toLowerCase());
  });

  const studentGoal = user?.metadata?.targetExam || 'NEET';
  const studentClass = user?.metadata?.studentClass || 'Class 11';
  const matchesStudentGoal = (course: any) => {
    const courseGoals = Array.isArray(course.targetExams) ? course.targetExams : [];
    return course.targetExam === studentGoal || courseGoals.includes(studentGoal);
  };

  // Filter Available Courses
  const filteredAvailableCourses = availableCourses.filter((course: any) => {
    const courseId = (course._id || course.id)?.toString();
    const courseName = (course.name || '').toString().trim().toLowerCase();
    if ((courseId && enrolledCourseIds.has(courseId)) || (courseName && enrolledCourseNames.has(courseName))) return false;
    if (!matchesStudentGoal(course)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (course.name || '').toLowerCase().includes(q);
      const matchSub = (course.subtitle || '').toLowerCase().includes(q);
      const matchExam = (course.targetExam || '').toLowerCase().includes(q);
      if (!matchName && !matchSub && !matchExam) return false;
    }

    // Optional class narrowing never expands beyond the student's goal.
    if (selectedGoalFilter === 'CLASS') {
      return !course.targetClass || course.targetClass === studentClass || course.targetClass === 'ALL';
    }
    return true;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Page Header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#111C3A] to-[#1C2541] p-8 md:p-10 text-white shadow-xl border border-gray-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C99A2E]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#C99A2E] text-[#0B132B]">
                Academic Hub
              </span>
              <span className="text-xs font-semibold text-gray-300">
                Target: <strong className="text-[#C99A2E]">{studentGoal}</strong> • {studentClass}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              My Courses & Batch Explorer
            </h1>
            <p className="text-sm text-gray-300 max-w-xl font-medium">
              Access your enrolled classrooms, daily DPPs, and explore specialized preparatory batches for your target goal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
              <TrendingUp className="text-[#C99A2E]" size={24} />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enrolled Batches</p>
                <p className="text-2xl font-black text-white leading-none mt-0.5">{batches.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
              <Compass className="text-emerald-400" size={24} />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Batches</p>
                <p className="text-2xl font-black text-white leading-none mt-0.5">{availableCourses.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Mode Navigation Tabs (Enrolled vs Explore) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('ENROLLED')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'ENROLLED'
                ? 'bg-[#0B132B] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutList size={16} className={activeTab === 'ENROLLED' ? 'text-[#C99A2E]' : ''} />
            <span>My Enrolled Courses ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPLORE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'EXPLORE'
                ? 'bg-[#0B132B] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass size={16} className={activeTab === 'EXPLORE' ? 'text-[#C99A2E]' : ''} />
            <span>Explore goal-based batches</span>
            <span className="w-2 h-2 rounded-full bg-[#C99A2E] animate-pulse"></span>
          </button>
        </div>

        {activeTab === 'EXPLORE' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search batches, exams, subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-medium focus:border-[#0B132B] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* SECTION 1: MY ENROLLED COURSES TAB */}
      {activeTab === 'ENROLLED' && (
        <div className="space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-72 bg-gray-100 rounded-3xl animate-pulse border border-gray-200"></div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8 space-y-4">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-[#C99A2E]">
                <LayoutList size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">No Enrolled Courses Yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  You are currently not enrolled in any academic batches. Explore our top recommended batches tailored for <strong>{studentGoal}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('EXPLORE')} 
                className="px-6 py-3 bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all"
              >
                Explore {studentGoal} Batches Now
              </button>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {batches.map((batch: any, idx: number) => {
                const course = batch.courseId || {};
                const access = course.access || { studyMaterials: true, liveClasses: true, dpps: true, testSeries: true };
                const isEnded = course.endDate && new Date(course.endDate) < new Date();
                const courseId = course._id || batch.courseId?._id || batch.courseId || batch._id;

                return (
                  <motion.div 
                    key={batch._id} 
                    variants={itemVariants} 
                    className="flex flex-col bg-white rounded-3xl shadow-sm border border-gray-200/90 overflow-hidden hover:shadow-xl hover:border-[#059669]/40 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    {/* Header Banner */}
                    <div className="p-6 bg-gradient-to-br from-[#0B132B] via-[#111C3A] to-[#1C2541] text-white relative flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {course.targetExam && (
                            <span className="bg-[#C99A2E] text-[#0B132B] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                              {course.targetExam}
                            </span>
                          )}
                          {course.targetClass && (
                            <span className="bg-white/15 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/90 border border-white/20">
                              {course.targetClass}
                            </span>
                          )}
                        </div>

                        <div className="bg-white/10 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-white/20 flex items-center gap-1">
                          {isEnded ? (
                            <><span className="w-2 h-2 rounded-full bg-red-400"></span> Concluded</>
                          ) : (
                            <><span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span> Active</>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                        {course.name || batch.name}
                      </h3>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned Batch</p>
                            <p className="text-gray-900 font-bold text-sm flex items-center gap-2">
                              {batch.name} {batch.section && <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">Sec {batch.section}</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Classmates</p>
                            <p className="text-gray-800 font-bold text-xs flex items-center justify-end gap-1">
                              <Users size={14} className="text-[#059669]" /> {batch.students?.length || 1} Enrolled
                            </p>
                          </div>
                        </div>

                        {/* Quick Action Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-gray-100">
                          {access.liveClasses && (
                            <button onClick={() => router.push('/student/live-classes')} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-[#059669] transition-all border border-gray-200/70 font-semibold">
                              <Video size={15} className="text-[#059669] shrink-0" />
                              <span className="text-xs font-bold">Live Classes</span>
                            </button>
                          )}

                          {access.studyMaterials && (
                            <button onClick={() => router.push('/student/study-materials')} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all border border-gray-200/70 font-semibold">
                              <BookOpen size={15} className="text-purple-600 shrink-0" />
                              <span className="text-xs font-bold">Materials</span>
                            </button>
                          )}
                          
                          {access.dpps && (
                            <button onClick={() => router.push('/student/dpp')} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-700 transition-all border border-gray-200/70 font-semibold">
                              <PenTool size={15} className="text-amber-600 shrink-0" />
                              <span className="text-xs font-bold">Daily DPPs</span>
                            </button>
                          )}
                          
                          {access.testSeries && (
                            <button onClick={() => router.push('/student/exams')} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all border border-gray-200/70 font-semibold">
                              <FileCheck size={15} className="text-blue-600 shrink-0" />
                              <span className="text-xs font-bold">Mock Exams</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* View Overview Link */}
                      <button
                        onClick={() => router.push(`/student/course/${courseId}?tab=classroom`)}
                        className="w-full py-3 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer"
                        style={{ background: '#059669' }}
                      >
                        <span>View Course Content & Schedule</span>
                        <ArrowRight size={14} />
                      </button>

                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Quick Explore Teaser inside Enrolled Tab */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-blue-50 border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0B132B] text-[#C99A2E]">
                Looking for more?
              </span>
              <h3 className="text-xl font-black text-[#0B132B]">Explore Other Academic Batches & Test Series</h3>
              <p className="text-xs text-gray-600 font-medium">
                Browse our complete catalogue of live crash courses, intensive revision batches, and test series for {studentGoal}.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('EXPLORE')}
              className="px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <Compass size={16} />
              <span>Explore {studentGoal} Batches</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: EXPLORE ALL BATCHES TAB */}
      {activeTab === 'EXPLORE' && (
        <div className="space-y-6">
          
          {/* Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setSelectedGoalFilter('RECOMMENDED')}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                selectedGoalFilter === 'RECOMMENDED'
                  ? 'bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/30'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Sparkles size={13} />
              <span>Recommended ({studentGoal})</span>
            </button>

            <button
              onClick={() => setSelectedGoalFilter('CLASS')}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                selectedGoalFilter === 'CLASS'
                  ? 'bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/30'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              📚 Same Class ({studentClass})
            </button>

          </div>

          {/* Available Batches Grid */}
          {loadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-gray-100 rounded-3xl animate-pulse border border-gray-200"></div>
              ))}
            </div>
          ) : filteredAvailableCourses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
                <BookOpen size={26} />
              </div>
              <h4 className="font-black text-gray-800 text-base">No batches found for this selection</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try clearing your search query. Only courses matching {studentGoal} are shown here.
              </p>
              <button
                onClick={() => { setSelectedGoalFilter('RECOMMENDED'); setSearchQuery(''); }}
                className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] text-xs font-black hover:bg-[#1C2541] transition-all"
              >
                Reset search
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredAvailableCourses.map((course: any) => {
                const cId = course._id || course.id;
                const isAlreadyEnrolled = enrolledCourseIds.has(cId?.toString());
                const isGoalMatch = matchesStudentGoal(course);
                
                const discount = course.actualFee && course.fee && course.actualFee > course.fee
                  ? Math.round(((course.actualFee - course.fee) / course.actualFee) * 100)
                  : null;

                return (
                  <motion.div
                    key={cId}
                    variants={itemVariants}
                    className="flex flex-col rounded-3xl overflow-hidden border border-gray-200/90 bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#059669]/40 hover:-translate-y-0.5 group"
                  >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-br from-[#0B132B] via-[#111C3A] to-[#1C2541] text-white relative space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAlreadyEnrolled ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#10B981] text-white flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={11} /> Enrolled
                          </span>
                        ) : isGoalMatch ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B] flex items-center gap-1 shadow-sm">
                            <Sparkles size={11} /> Goal Match
                          </span>
                        ) : null}

                        {course.targetExam && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 uppercase tracking-wider text-white">
                            {course.targetExam}
                          </span>
                        )}
                        {course.targetClass && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/90">
                            {course.targetClass}
                          </span>
                        )}
                        {course.badge && (
                          <span className="ml-auto text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-900">
                            {course.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-2">
                        {course.name}
                      </h3>
                      {course.subtitle && (
                        <p className="text-gray-300 text-xs font-medium line-clamp-1">
                          {course.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex-1 flex flex-col p-6 justify-between space-y-5">
                      
                      {/* Feature Bullets */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Curriculum Inclusions</p>
                        <ul className="space-y-1.5">
                          {(course.features || [
                            "Interactive Live Classes & Archives",
                            "Daily DPPs with Video Solutions",
                            "All India Test Series (AITS) CBT",
                            "24/7 Doubt Engine Support"
                          ]).slice(0, 3).map((f: string, fi: number) => (
                            <li key={fi} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle2 size={14} className="text-[#059669] shrink-0 mt-0.5" />
                              <span className="leading-tight font-medium line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pricing & Navigation Action */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            {course.actualFee && course.actualFee > (course.fee || 0) && (
                              <span className="text-xs font-bold text-gray-400 line-through">
                                ₹{course.actualFee.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xl font-black text-[#0B132B]">
                              ₹{course.fee?.toLocaleString() || 0}
                            </span>
                          </div>
                          {discount && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              Save {discount}%
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => router.push(`/student/course/${cId}`)}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                            isAlreadyEnrolled
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black'
                              : 'bg-[#059669] hover:bg-[#047857] text-white shadow-md'
                          }`}
                        >
                          <span>{isAlreadyEnrolled ? 'Go to Batch' : 'Explore Batch'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        </div>
      )}

    </div>
  );
}
