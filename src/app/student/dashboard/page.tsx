"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Video,
  FileCheck,
  ChevronRight,
  Clock,
  Search,
  Compass,
  Layers,
  Globe,
  Sparkles,
  Pencil,
  Check,
  X,
  ArrowRight,
  Trophy,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { studentAPI } from '@/api/index.js';

import StudentPerformanceCard from '@/components/StudentPerformanceCard';
import { BannerCarousel } from '@/components/BannerCarousel';

const EXAM_GOALS = [
  { id: "NEET", title: "NEET UG", tagline: "Medical Entrance" },
  { id: "IIT-JEE", title: "IIT JEE", tagline: "Engineering (Mains & Adv)" },
  { id: "BOARDS-11-12", title: "Class 11 & 12", tagline: "Boards Prep" },
  { id: "FOUNDATION-9-10", title: "Class 9 & 10", tagline: "Foundation & Olympiad" },
  { id: "CUET-GOVT", title: "CUET & Govt", tagline: "Central Univ & Aptitude" }
];

const CLASSES = [
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Class 11", label: "Class 11" },
  { id: "Class 12", label: "Class 12" },
  { id: "Dropper", label: "12th Pass / Dropper" }
];

const MEDIUMS = [
  { id: "Hinglish", label: "Hinglish (Mix)" },
  { id: "English", label: "English" },
  { id: "Hindi", label: "Hindi" }
];

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
  const [unenrolledCourses, setUnenrolledCourses] = useState<any[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Preference Switcher Modal State
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [prefGoal, setPrefGoal] = useState('NEET');
  const [prefClass, setPrefClass] = useState('Class 11');
  const [prefMedium, setPrefMedium] = useState('Hinglish');
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    let parsedUser: any = null;
    const stored = localStorage.getItem('user');
    if (stored) {
      parsedUser = JSON.parse(stored);
      setUser(parsedUser);
      if (parsedUser.metadata?.targetExam) setPrefGoal(parsedUser.metadata.targetExam);
      if (parsedUser.metadata?.studentClass) setPrefClass(parsedUser.metadata.studentClass);
      if (parsedUser.metadata?.medium) setPrefMedium(parsedUser.metadata.medium);
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
          const query = new URLSearchParams();
          if (uInstId) query.set('instituteId', uInstId);
          if (parsedUser?.metadata?.targetExam) {
            query.set('targetExam', parsedUser.metadata.targetExam);
            query.set('strictGoal', 'true');
          }
          const url = `/api/v1/public/courses${query.size ? `?${query}` : ''}`;
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

        // Fetch live classes
        try {
          const liveClassesRes = await studentAPI.getLiveClasses();
          const ongoing = (liveClassesRes.data?.data || []).filter((c: any) => c.status === 'ONGOING');
          setActiveClasses(ongoing);
        } catch (err: any) {
          if (err?.response?.status === 403) {
            console.log("Live classes restricted for student's current plan.");
          } else {
            console.warn("Failed to fetch live classes:", err?.message || err);
          }
          setActiveClasses([]);
        }

      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      const token = localStorage.getItem('token');
      const updatedMetadata = {
        ...(user?.metadata || {}),
        targetExam: prefGoal,
        studentClass: prefClass,
        medium: prefMedium,
        isProfileIncomplete: false
      };

      await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ metadata: updatedMetadata })
      });

      const updatedUser = { ...user, metadata: updatedMetadata };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowPreferenceModal(false);
      toast.success("Learning goals updated successfully!");
    } catch {
      toast.error("Failed to update preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  const currentGoal = user?.metadata?.targetExam || 'NEET';
  const currentClass = user?.metadata?.studentClass || 'Class 11';
  const currentMedium = user?.metadata?.medium || 'Hinglish';

  const matchesCurrentGoal = (course: any) => {
    const courseGoals = Array.isArray(course.targetExams) ? course.targetExams : [];
    return course.targetExam === currentGoal || courseGoals.includes(currentGoal);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const filteredCourses = unenrolledCourses.filter((course: any) => {
    // A student should only be offered courses explicitly configured for their goal.
    // Global / legacy courses are not upgrades until an admin targets them.
    if (!matchesCurrentGoal(course)) return false;

    // Search query match
    if (courseSearchQuery.trim()) {
      const q = courseSearchQuery.trim().toLowerCase();
      const matchesSearch =
        (course.name || '').toLowerCase().includes(q) ||
        (course.subtitle || '').toLowerCase().includes(q) ||
        (course.description || '').toLowerCase().includes(q) ||
        (course.tag || '').toLowerCase().includes(q) ||
        (course.targetExam || '').toLowerCase().includes(q) ||
        String(course.fee || '').includes(q);

      if (!matchesSearch) return false;
    }

    return true;
  });

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8 pb-12">
      {/* ─── Hero / Header with Goal Preferences Pill ─────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#121C3B] to-[#0B132B] p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <BookOpen size={200} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C99A2E]/20 text-[#C99A2E] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C99A2E]/30">
              <Sparkles size={13} /> Student Portal
            </div>
            <h1 className="text-2xl md:text-4xl font-bold font-display tracking-tight text-white mb-2">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 👋
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm max-w-xl">
              Track your syllabus, attend live sessions, practice DPPs, and achieve your top exam rank.
            </p>
          </div>

          {/* Active Learning Goal Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C99A2E]">Active Goal</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">{currentGoal}</span>
                <span className="text-xs font-bold text-white/60">• {currentClass}</span>
                <span className="text-xs font-bold text-[#C99A2E]">• {currentMedium}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPreferenceModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white text-[#0B132B] font-bold text-xs hover:bg-[#C99A2E] hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <Pencil size={13} /> Change Goal
            </button>
          </div>
        </div>
      </header>

      {/* Promotional Banners Carousel */}
      <BannerCarousel />

      {/* Student Performance Card */}
      <StudentPerformanceCard />

      {/* ─── Available & Recommended Courses Section ───────────────────────────── */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-[#0B132B]">Targeted Courses & Batches</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#C99A2E]/20 text-[#9A6E1C] border border-[#C99A2E]/30">
                {filteredCourses.length} Available
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Personalized for your <span className="font-bold text-[#0B132B]">{currentGoal}</span> target preparation.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search courses..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#0B132B] transition-all font-medium text-gray-800"
            />
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse space-y-4">
                <div className="h-6 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-20 bg-gray-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0B132B]/5 flex items-center justify-center mx-auto mb-3 text-[#0B132B]">
              <BookOpen size={26} />
            </div>
            <p className="font-bold text-[#0B132B] text-base">No courses found</p>
            <p className="text-xs text-gray-400 mt-1">No upgrade course is configured for your current goal yet.</p>
            <button
              onClick={() => setShowPreferenceModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold hover:bg-[#C99A2E] transition-all"
            >
              Change Learning Goal
            </button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCourses.map((plan: any) => {
              const planColor = plan.color || '#0B132B';
              const isGoalMatch = matchesCurrentGoal(plan);

              return (
                <motion.div
                  key={plan._id}
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="flex flex-col rounded-3xl overflow-hidden border-2 bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#0B132B]"
                  style={{ borderColor: plan.popular ? '#C99A2E' : '#e5e7eb' }}
                >
                  {/* Card Header */}
                  <div
                    className="px-6 pt-6 pb-5 text-white relative"
                    style={{ background: `linear-gradient(145deg, ${planColor} 0%, ${planColor}dd 100%)` }}
                  >
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {isGoalMatch && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B] flex items-center gap-1 shadow-sm">
                          <Sparkles size={11} /> Goal Match
                        </span>
                      )}
                      {plan.targetExam && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 uppercase tracking-wider">
                          {plan.targetExam}
                        </span>
                      )}
                      {plan.targetClass && plan.targetClass !== 'ALL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 border border-white/25">
                          {plan.targetClass}
                        </span>
                      )}
                      {plan.badge && (
                        <span className="ml-auto text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B]">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-xl leading-tight mb-1 line-clamp-2">{plan.name}</h3>
                    <p className="text-white/80 text-xs line-clamp-1">{plan.subtitle || plan.description || 'Complete structured course package.'}</p>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col p-6">
                    <div className="mb-5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-gray-500">
                        <FileCheck className="w-3.5 h-3.5 text-[#0B132B]" /> What&apos;s Included
                      </p>
                      <ul className="space-y-2">
                        {(plan.features || ["Live Interactive Classes", "Chapterwise DPPs & Video Solutions", "Computer-based Test Series", "NCERT Modules"]).slice(0, 4).map((f: string, fi: number) => (
                          <li key={fi} className="flex items-start gap-2.5 text-xs text-gray-700">
                            <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            <span className="leading-snug font-medium">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Enroll Button */}
                    <div className="mt-auto pt-4">
                      <button
                        onClick={() => router.push(`/student/course/${plan._id}`)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all shadow-md hover:opacity-95 active:scale-[0.98]"
                        style={{ background: `linear-gradient(135deg, #0B132B 0%, #1A2752 60%, #C99A2E 100%)` }}
                      >
                        View Course & Enroll <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fee Footer */}
                  <div className="px-6 py-3.5 flex items-center justify-between border-t border-gray-100 bg-gray-50/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Course Fee</span>
                    <div className="flex items-center gap-2">
                      {plan.actualFee && (
                        <span className="text-xs font-bold line-through text-gray-400">₹{plan.actualFee?.toLocaleString()}</span>
                      )}
                      <span className="text-xl font-black text-[#0B132B]">₹{plan.fee?.toLocaleString() || 'Free'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ─── Preference Switcher Dialog ("Provide Details / Change Goal") ───────── */}
      <AnimatePresence>
        {showPreferenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B132B]/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 bg-[#0B132B] text-white flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C99A2E]/20 text-[#C99A2E] text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sparkles size={11} /> Profile Details
                  </div>
                  <h3 className="text-lg font-black">Update Learning Goal</h3>
                </div>
                <button
                  onClick={() => setShowPreferenceModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePreferences} className="p-6 space-y-5">
                {/* 1. Target Exam */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Compass size={14} className="text-[#C99A2E]" /> 1. Target Exam
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAM_GOALS.map(goal => {
                      const isSelected = prefGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => setPrefGoal(goal.id)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-[#0B132B] bg-[#0B132B]/5 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-xs text-[#0B132B]">{goal.title}</p>
                            {isSelected && <Check size={14} className="text-[#0B132B]" />}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{goal.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Target Class */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#C99A2E]" /> 2. Class / Grade
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CLASSES.map(cls => {
                      const isSelected = prefClass === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setPrefClass(cls.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#0B132B] text-white border-[#C99A2E] shadow-sm'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent'
                          }`}
                        >
                          {cls.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Medium */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={14} className="text-[#C99A2E]" /> 3. Preferred Language
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDIUMS.map(med => {
                      const isSelected = prefMedium === med.id;
                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => setPrefMedium(med.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#0B132B] text-[#C99A2E] border-[#C99A2E] shadow-sm ring-2 ring-[#C99A2E]/20'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent'
                          }`}
                        >
                          {isSelected ? `✓ ${med.label}` : med.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={savingPreferences}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-xs sm:text-sm transition-all shadow-md hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
                  style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1A2752 50%, #C99A2E 100%)' }}
                >
                  {savingPreferences ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save & Apply Preferences</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
