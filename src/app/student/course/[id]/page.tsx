"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Trophy, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Loader2, 
  LogOut, 
  GraduationCap, 
  Layers, 
  FileCheck, 
  HelpCircle, 
  Video, 
  MessageSquare, 
  ChevronDown, 
  Play, 
  Sparkles, 
  Shield,
  Compass,
  Check,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const calculateDuration = (start: any, end: any, fallback: string) => {
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const months = Math.round(diffDays / 30);
      return `${months} Month${months !== 1 ? 's' : ''}`;
    }
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  }
  return fallback || 'N/A';
};

function EasebuzzPaymentModal({ course, onClose, onAuthError }: { course: any; onClose: () => void; onAuthError: () => void }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onAuthError();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payments/easebuzz/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: course._id })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        if (res.status === 401 || data.message?.toLowerCase().includes('token') || data.message?.toLowerCase().includes('auth')) {
          onAuthError();
          return;
        }
        throw new Error(data.message || 'Payment initiation failed');
      }

      if (data.paymentUrl) {
        toast.loading('Redirecting to Easebuzz Payment Gateway...');
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Could not obtain Easebuzz payment URL');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        
        <div className="bg-gradient-to-r from-[#0B132B] to-[#1E293B] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-[#C99A2E]">
              ₹
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Course Checkout</h3>
              <p className="text-xs text-[#C99A2E] font-medium">Secured by Easebuzz Gateway</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 sm:p-7">
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-5 mb-6 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-[#0B132B] uppercase tracking-wider">Selected Course</span>
              <h4 className="font-bold text-gray-900 text-base leading-tight mt-0.5">{course.name}</h4>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 border-dashed">
              <span className="text-sm font-semibold text-gray-500">Total Payable</span>
              <span className="text-2xl font-black text-gray-900">₹{course.fee?.toLocaleString() || 0}</span>
            </div>
          </div>

          <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3.5 mb-6 flex items-center gap-3 text-xs font-medium border border-emerald-200/60">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>Instant enrollment & access to batch materials upon successful payment.</span>
          </div>

          <button onClick={handlePay} disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base transition-all shadow-xl shadow-blue-950/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0B132B, #1E293B)' }}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin text-[#C99A2E]" />
                <span>Connecting to Gateway...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{course.fee?.toLocaleString() || 0} via Easebuzz</span>
                <ArrowRight size={18} className="text-[#C99A2E]" />
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-gray-400 font-medium mt-4 flex items-center justify-center gap-1.5">
            <Shield size={13} /> 256-bit Encrypted • UPI, Cards, Netbanking Supported
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'classroom' | 'test-series' | 'faculties' | 'faqs'>('description');
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Auth & Modals State
  const [user, setUser] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Explore other courses state
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loadingOtherCourses, setLoadingOtherCourses] = useState(false);
  const [exploreFilter, setExploreFilter] = useState<'GOAL' | 'CLASS' | 'ALL'>('GOAL');

  // Load User
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) {
        try { setUser(JSON.parse(storedUser)); } catch (e) {}
      } else {
        setUser(null);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Check Enrollment Status
  useEffect(() => {
    if (!id || !user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/v1/batches/my-batches', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const isUserEnrolled = data.data.some((batch: any) => 
            batch.courseId?._id === id || batch.courseId === id
          );
          if (isUserEnrolled) {
            setIsEnrolled(true);
          }
        }
      })
      .catch(console.error);
  }, [id, user]);

  // Load Main Course
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');

    const fetchCourse = async () => {
      try {
        let res = token ? await fetch(`/api/v1/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } }) : null;
        let data = res && res.ok ? await res.json() : null;
        if (!data || !data.success || !data.data) {
          const publicRes = await fetch(`/api/v1/public/courses/${id}`);
          data = await publicRes.json();
        }
        if (data && data.success) {
          setCourse(data.data);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  // Load Other Available Courses for Exploration
  useEffect(() => {
    const fetchOtherCourses = async () => {
      try {
        setLoadingOtherCourses(true);
        const res = await fetch('/api/v1/public/courses');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setAllCourses(data.data);
        }
      } catch (err) {
        console.error('Failed to load available courses:', err);
      } finally {
        setLoadingOtherCourses(false);
      }
    };

    fetchOtherCourses();
  }, []);

  // Load Exams for Test Series Tab
  useEffect(() => {
    if (activeTab === 'test-series') {
      const token = localStorage.getItem('token');
      if (token) {
        setLoadingExams(true);
        fetch('/api/v1/exams', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setExams(data.data || []);
            }
          })
          .catch(() => {})
          .finally(() => setLoadingExams(false));
      }
    }
  }, [activeTab]);

  const handleAuthError = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowPayment(false);
    toast.error('Please login to continue.');
    router.push('/');
  };

  const handleBuyClick = () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      toast.error('Authentication error. Please refresh.');
      return;
    }
    const isIncomplete = 
      !user.firstName || 
      !user.lastName || 
      !user.phone || 
      (user.role !== 'parent' && !user.email) || 
      user.lastName === '.' || 
      user.metadata?.isProfileIncomplete === true ||
      (user.email && user.email.startsWith('student_') && user.email.endsWith('@skd.com')) ||
      (user.email && user.email.startsWith('parent_') && user.email.endsWith('@skd.com'));

    if (isIncomplete) {
      toast.error('Please complete your profile details before purchasing courses.');
      setTimeout(() => {
        router.push(`/${user.role || 'student'}/profile`);
      }, 1500);
      return;
    }
    setShowPayment(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#0B132B] animate-spin" /></div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Course not found</div>;

  const color = course.color || '#0B132B';
  const discountPercent = course.actualFee && course.fee && course.actualFee > course.fee
    ? Math.round(((course.actualFee - course.fee) / course.actualFee) * 100)
    : null;

  // Active preferences
  const targetGoal = course.targetExam || user?.metadata?.targetExam || 'NEET';
  const targetClass = course.targetClass || user?.metadata?.studentClass || 'Class 11';
  const targetMedium = course.medium || user?.metadata?.medium || 'Hinglish';

  // Filter other courses (exclude current course)
  const otherCourses = allCourses.filter(c => (c._id || c.id) !== id);

  const filteredExploreCourses = otherCourses.filter(c => {
    if (exploreFilter === 'GOAL') {
      return !c.targetExam || c.targetExam === targetGoal || c.targetExam === 'ALL';
    }
    if (exploreFilter === 'CLASS') {
      return !c.targetClass || c.targetClass === targetClass || c.targetClass === 'ALL';
    }
    return true; // ALL
  });

  const FAQS_LIST = [
    {
      q: "How do I attend Live and Recorded classes?",
      a: "All scheduled classes are conducted live on the platform with interactive chat and real-time polls. If you miss a live session, the full recording with chapters and transcript is uploaded within 2 hours."
    },
    {
      q: "Are DPPs (Daily Practice Problems) and Class Notes provided?",
      a: "Yes! High-yield curated Daily Practice Problems (DPPs) with video solutions and downloadable PDF annotated teacher notes are provided right after each lecture."
    },
    {
      q: "What is the Test Series schedule and evaluation process?",
      a: "The batch includes regular Part Tests every 2-3 weeks, Chapter-wise Quizzes, and Full-Syllabus All-India Mock Exams strictly mirroring the official NEET/JEE pattern with instant All-India Rank (AIR) and AI-powered performance analytics."
    },
    {
      q: "How will my doubts be resolved during and after class?",
      a: "You can ask doubts in live chat during lectures. In addition, our 24/7 Doubt Engine allows you to snap a picture of any question and receive verified faculty explanations with video hints."
    },
    {
      q: "Can I access the batch on mobile, tablet, and PC?",
      a: "Yes, you can access your enrolled batches and classroom seamlessly across Web, Android, and iOS devices with automated sync across devices."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 text-gray-900">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-[#0B132B] text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <Link href="/student/dashboard" className="hover:text-[#C99A2E] transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-[#C99A2E]">{course.targetExam || 'Courses'}</span>
              <span>/</span>
              <span className="text-gray-200 truncate max-w-[200px]">{course.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEnrolled ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Enrolled Student
              </span>
            ) : (
              <button
                onClick={handleBuyClick}
                className="px-4 py-2 rounded-xl text-xs font-black bg-[#C99A2E] text-[#0B132B] hover:bg-[#b58724] transition-all shadow-md"
              >
                Enroll Now • ₹{course.fee?.toLocaleString() || 0}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Physics Wallah Style Hero Header */}
      <section className="bg-gradient-to-r from-[#0B132B] via-[#111C3A] to-[#1C2541] text-white pt-8 pb-10 border-b border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C99A2E]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {course.targetExam && (
                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#C99A2E] text-[#0B132B] shadow-sm">
                    {course.targetExam}
                  </span>
                )}
                {course.targetClass && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/15 text-white backdrop-blur-md border border-white/20">
                    {course.targetClass}
                  </span>
                )}
                {course.medium && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-200 border border-white/15">
                    {course.medium} Medium
                  </span>
                )}
                {course.badge && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {course.badge}
                  </span>
                )}
                {isEnrolled && (
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                    <CheckCircle2 size={13} /> Enrolled
                  </span>
                )}
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {course.name}
              </h1>

              {course.subtitle && (
                <p className="text-sm sm:text-base text-gray-300 font-medium leading-relaxed max-w-2xl">
                  {course.subtitle}
                </p>
              )}

              {/* Quick Metadata Bar */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-gray-300 font-medium">
                <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                  <Clock size={14} className="text-[#C99A2E]" />
                  <span>Duration: <strong className="text-white">{calculateDuration(course.startDate, course.endDate, course.duration)}</strong></span>
                </div>
                {course.startDate && (
                  <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                    <Sparkles size={14} className="text-[#C99A2E]" />
                    <span>Starts: <strong className="text-white">{new Date(course.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                  <Video size={14} className="text-[#C99A2E]" />
                  <span>Live & Recorded Lectures</span>
                </div>
              </div>

            </div>

            {/* Quick Hero Right Action */}
            {isEnrolled && (
              <div className="lg:self-center shrink-0">
                <button
                  onClick={() => router.push(`/student/batches`)}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition-all shadow-lg flex items-center gap-2"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Go to My Classroom</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Physics Wallah Sticky Navigation Tabs */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-4 px-2 sm:px-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'description'
                  ? 'border-[#0B132B] text-[#0B132B]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <BookOpen size={16} className={activeTab === 'description' ? 'text-[#C99A2E]' : ''} />
              <span>Overview & Description</span>
            </button>

            <button
              onClick={() => setActiveTab('classroom')}
              className={`py-4 px-2 sm:px-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'classroom'
                  ? 'border-[#0B132B] text-[#0B132B]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers size={16} className={activeTab === 'classroom' ? 'text-[#C99A2E]' : ''} />
              <span>Classroom / Subjects</span>
            </button>

            <button
              onClick={() => setActiveTab('test-series')}
              className={`py-4 px-2 sm:px-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'test-series'
                  ? 'border-[#0B132B] text-[#0B132B]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileCheck size={16} className={activeTab === 'test-series' ? 'text-[#C99A2E]' : ''} />
              <span>Test Series / Exams</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                NTA Pattern
              </span>
            </button>

            <button
              onClick={() => setActiveTab('faculties')}
              className={`py-4 px-2 sm:px-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'faculties'
                  ? 'border-[#0B132B] text-[#0B132B]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <GraduationCap size={16} className={activeTab === 'faculties' ? 'text-[#C99A2E]' : ''} />
              <span>Faculties ({course.faculties?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('faqs')}
              className={`py-4 px-2 sm:px-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'faqs'
                  ? 'border-[#0B132B] text-[#0B132B]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <HelpCircle size={16} className={activeTab === 'faqs' ? 'text-[#C99A2E]' : ''} />
              <span>FAQs & Support</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Tab Views */}
          <div className="lg:w-2/3 w-full space-y-8">
            
            {/* TAB 1: DESCRIPTION */}
            {activeTab === 'description' && (
              <div className="space-y-6 animate-fadeIn">
                {/* About Box */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <h2 className="text-xl font-black text-[#0B132B] mb-4 flex items-center gap-2.5">
                    <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                    About This Batch
                  </h2>
                  <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap">
                    {course.description || "The ultimate preparation program carefully designed by top educators to help you achieve top ranks with comprehensive concept coverage, daily problem solving, and rigorous mock tests."}
                  </p>
                </div>

                {/* Batch Highlights Grid */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <h2 className="text-xl font-black text-[#0B132B] mb-6 flex items-center gap-2.5">
                    <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                    Key Batch Deliverables
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shrink-0">
                        <Video size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">Live & Recorded Lectures</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Interactive live classes + 24/7 unlimited access to full HD class archives.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shrink-0">
                        <FileCheck size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">Daily DPPs with Video Solutions</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Curated practice problem sets after every lecture with step-by-step video hints.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shrink-0">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">All India Test Series (AITS)</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Exact NTA Computer Based Test pattern with real-time All India Rank (AIR).</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shrink-0">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">24/7 AI Doubt Engine</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Instant faculty & smart doubt resolution engine for round-the-clock support.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                {course.features?.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                    <h2 className="text-xl font-black text-[#0B132B] mb-6 flex items-center gap-2.5">
                      <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                      What You Will Get
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {course.features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/60">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-gray-800 font-semibold text-sm leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Suited For */}
                {course.bestFor?.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                    <h2 className="text-xl font-black text-[#0B132B] mb-5 flex items-center gap-2.5">
                      <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                      Best Suited For
                    </h2>
                    <div className="flex flex-wrap gap-2.5">
                      {course.bestFor.map((bf: string, idx: number) => (
                        <span key={idx} className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold">
                          🎯 {bf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CLASSROOM */}
            {activeTab === 'classroom' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <h2 className="text-xl font-black text-[#0B132B] mb-2 flex items-center gap-2.5">
                    <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                    Batch Classroom & Syllabus Roadmap
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-6 font-medium">
                    Structured topic roadmap, daily DPP schedules, and lecture archives for this batch.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {['Physics', 'Chemistry', course.targetExam === 'NEET' ? 'Biology' : 'Mathematics'].map((subject) => (
                      <div key={subject} className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-black text-gray-900 text-base">{subject}</h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0B132B] text-[#C99A2E]">
                            Core Subject
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">25+ Structured Chapters • 120+ DPP Sets</p>
                      </div>
                    ))}
                  </div>

                  {isEnrolled ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                      <h4 className="font-black text-emerald-950 text-base">You are an active enrolled student!</h4>
                      <p className="text-xs text-emerald-800">Access all live class streams, video recordings, DPPs and notes inside your student batch portal.</p>
                      <button
                        onClick={() => router.push('/student/batches')}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md"
                      >
                        Open Classroom Portal
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-3">
                      <Layers size={32} className="mx-auto text-gray-400" />
                      <h4 className="font-black text-gray-800 text-base">Enroll to Unlock Full Classroom</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">Get full access to live lecture streams, daily DPP downloads, annotated PDF notes, and revision modules.</p>
                      <button
                        onClick={handleBuyClick}
                        className="px-6 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] font-bold text-xs hover:bg-[#1C2541] transition-all shadow-md"
                      >
                        Enroll in Batch Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: TEST SERIES */}
            {activeTab === 'test-series' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-[#0B132B] flex items-center gap-2.5">
                        <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                        Mock Tests & All India Test Series (AITS)
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                        Full NTA Computer Based Test (CBT) simulator with instant All India Rank and AI analysis.
                      </p>
                    </div>

                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 self-start">
                      Included with Batch
                    </span>
                  </div>

                  {loadingExams ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#0B132B] animate-spin mb-2" />
                      <p className="text-xs text-gray-500 font-semibold">Loading test series schedule...</p>
                    </div>
                  ) : exams.length > 0 ? (
                    <div className="space-y-3.5">
                      {exams.map((exam, idx) => (
                        <div 
                          key={exam._id || idx}
                          className="p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-200/80 hover:border-gray-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0B132B] text-[#C99A2E]">
                                {exam.pattern || course.targetExam || 'CBT TEST'}
                              </span>
                              <span className="text-xs font-bold text-gray-500">Test #{idx + 1}</span>
                            </div>
                            <h4 className="font-black text-gray-900 text-base">{exam.title || exam.name || `Mock Exam ${idx + 1}`}</h4>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                              <span>⏱ {exam.duration || 180} Mins</span>
                              <span>•</span>
                              <span>📊 {exam.totalMarks || 300} Total Marks</span>
                              <span>•</span>
                              <span>❓ {exam.questionsCount || 75} Questions</span>
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/student/exams/${exam._id || ''}`)}
                            className="px-5 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs transition-all shadow flex items-center justify-center gap-1.5 self-start sm:self-center"
                          >
                            <span>Attempt Test</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {[
                        { title: `${course.targetExam || 'NEET/JEE'} Part Test 01 - Mechanics & Foundations`, duration: 180, marks: 300, q: 75 },
                        { title: `${course.targetExam || 'NEET/JEE'} Part Test 02 - Electrodynamics & Chemical Bonding`, duration: 180, marks: 300, q: 75 },
                        { title: `${course.targetExam || 'NEET/JEE'} Full Syllabus All India Grand Mock Test`, duration: 180, marks: 720, q: 200 }
                      ].map((item, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#0B132B] text-[#C99A2E]">
                              SCHEDULED #{idx + 1}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base mt-1">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">⏱ {item.duration} Mins • 📊 {item.marks} Marks • ❓ {item.q} Questions</p>
                          </div>
                          <button
                            onClick={handleBuyClick}
                            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
                          >
                            {isEnrolled ? 'View Schedule' : 'Unlock with Batch'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: FACULTIES */}
            {activeTab === 'faculties' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <h2 className="text-xl font-black text-[#0B132B] mb-2 flex items-center gap-2.5">
                    <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                    Faculty Mentors Roster
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mb-6">
                    Learn from India's top educators with decades of mentoring experience in JEE/NEET.
                  </p>

                  {course.faculties?.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-5">
                      {course.faculties.map((f: any) => {
                        const name = `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Educator';
                        const subject = f.metadata?.subject || f.metadata?.designation || 'Faculty Mentor';
                        const bio = f.metadata?.bio || f.metadata?.experience || 'Master Educator specialized in competitive exam preparation.';
                        
                        return (
                          <div key={f._id} className="p-6 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-200/80 hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-[#0B132B] text-[#C99A2E] font-black text-lg flex items-center justify-center shadow-md overflow-hidden shrink-0">
                                  {f.profilePictureUrl ? (
                                    <img src={f.profilePictureUrl} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    `${f.firstName?.[0] || 'T'}${f.lastName?.[0] || ''}`
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-black text-gray-900 text-lg leading-tight">{name}</h3>
                                  <span className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full bg-[#0B132B] text-[#C99A2E]">
                                    {subject}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                                {bio}
                              </p>
                            </div>
                            <div className="mt-5 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs font-bold text-gray-500">
                              <span>⭐ 4.9/5 Rating</span>
                              <span className="text-emerald-700">Verified Mentor</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                      <GraduationCap size={40} className="mx-auto text-gray-400 mb-2" />
                      <h4 className="font-bold text-gray-800 text-base">Top Academic Mentors</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        This batch is delivered by experienced senior faculty members with proven results.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: FAQS */}
            {activeTab === 'faqs' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
                  <h2 className="text-xl font-black text-[#0B132B] mb-2 flex items-center gap-2.5">
                    <span className="w-2.5 h-6 bg-[#C99A2E] rounded-full inline-block"></span>
                    Frequently Asked Questions
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mb-6">
                    Find quick answers about batch access, test schedules, and DPPs.
                  </p>

                  <div className="space-y-3">
                    {FAQS_LIST.map((faq, idx) => {
                      const isOpen = openFaq === idx;
                      return (
                        <div key={idx} className="border border-gray-200/80 rounded-2xl overflow-hidden">
                          <button
                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                            className="w-full p-4 sm:p-5 text-left font-black text-gray-900 text-sm sm:text-base flex items-center justify-between gap-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                          >
                            <span>{faq.q}</span>
                            <ChevronDown size={18} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed bg-gray-50/50 border-t border-gray-100">
                                  {faq.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Sticky Purchase & Batch Status Card */}
          <div className="lg:w-1/3 w-full">
            <div className="sticky top-20 bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden">
              <div className="h-2.5 bg-gradient-to-r from-[#0B132B] via-[#C99A2E] to-[#0B132B]" />
              
              <div className="p-6 sm:p-7 space-y-6">
                
                {/* Pricing Block */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batch Tuition Fee</span>
                    {discountPercent && (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2.5 mt-1">
                    {course.actualFee && (
                      <span className="text-2xl font-bold text-gray-400 line-through">
                        ₹{course.actualFee.toLocaleString()}
                      </span>
                    )}
                    <span className="text-4xl font-black text-gray-900">
                      ₹{course.fee?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">/ full course</span>
                  </div>
                </div>

                {/* Primary CTA */}
                {isEnrolled ? (
                  <button
                    onClick={() => router.push('/student/batches')}
                    className="w-full py-4 rounded-2xl text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:opacity-95"
                    style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
                  >
                    <CheckCircle2 size={20} />
                    <span>Go to Classroom</span>
                  </button>
                ) : user && (
                  !user.firstName || 
                  !user.lastName || 
                  !user.phone || 
                  (user.role !== 'parent' && !user.email) || 
                  user.lastName === '.' || 
                  user.metadata?.isProfileIncomplete === true ||
                  (user.email && user.email.startsWith('student_') && user.email.endsWith('@skd.com')) ||
                  (user.email && user.email.startsWith('parent_') && user.email.endsWith('@skd.com'))
                ) ? (
                  <button 
                    onClick={() => router.push(`/${user.role || 'student'}/profile`)}
                    className="w-full py-4 rounded-2xl text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:opacity-95 bg-red-600"
                  >
                    <span>Complete Profile to Enroll</span>
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleBuyClick}
                    className="w-full py-4 rounded-2xl text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-blue-900/20"
                    style={{ background: 'linear-gradient(135deg, #0B132B, #1E293B)' }}
                  >
                    <span className="text-[#C99A2E]">{user ? 'ENROLL IN BATCH NOW' : 'LOGIN TO ENROLL'}</span>
                    <ArrowRight size={18} className="text-[#C99A2E] group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* Access Inclusions List */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">This Batch Includes</p>
                  
                  <div className="space-y-2.5 text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Daily Interactive Live Lectures</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Daily DPPs with Video Solutions</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>NTA Pattern Mock Test Series & AIR</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>24x7 Verified Doubt Assistance</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Comprehensive Class Notes (PDF)</span>
                    </div>
                  </div>
                </div>

                {/* Batch Guarantee Footer */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-center">
                  <p className="text-[11px] font-bold text-amber-900">
                    🏆 100% Comprehensive Syllabus Coverage by Top Faculty
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* EXPLORE OTHER COURSES FOR THIS PREFERENCE SECTION */}
        <section className="mt-16 pt-12 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#0B132B] text-[#C99A2E] flex items-center gap-1.5 shadow-sm">
                  <Compass size={14} /> Recommended Batches
                </span>
                <span className="text-xs font-bold text-gray-500">
                  Target: <strong className="text-gray-800">{targetGoal}</strong> • {targetClass}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] tracking-tight">
                Explore Other Batches & Courses
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                Discover more specialized preparation batches, crash courses, and test series for your target goal.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setExploreFilter('GOAL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                  exploreFilter === 'GOAL'
                    ? 'bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/30'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                🎯 {targetGoal} Batches
              </button>

              <button
                onClick={() => setExploreFilter('CLASS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                  exploreFilter === 'CLASS'
                    ? 'bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/30'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📚 {targetClass}
              </button>

              <button
                onClick={() => setExploreFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                  exploreFilter === 'ALL'
                    ? 'bg-[#0B132B] text-[#C99A2E] border-[#0B132B] shadow-md ring-2 ring-[#C99A2E]/30'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                🌟 All Available Batches
              </button>
            </div>
          </div>

          {/* Other Courses Grid */}
          {loadingOtherCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-200/70 animate-pulse space-y-4">
                  <div className="h-6 bg-gray-100 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : filteredExploreCourses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h4 className="font-black text-gray-800 text-base">No other courses found under this filter</h4>
              <p className="text-xs text-gray-500">Try switching the filter to "All Available Batches" to see our complete catalogue.</p>
              <button
                onClick={() => setExploreFilter('ALL')}
                className="px-5 py-2 rounded-xl bg-[#0B132B] text-[#C99A2E] text-xs font-black hover:bg-[#1C2541] transition-all"
              >
                View All Batches
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExploreCourses.map((otherCourse: any) => {
                const cId = otherCourse._id || otherCourse.id;
                const otherDiscount = otherCourse.actualFee && otherCourse.fee && otherCourse.actualFee > otherCourse.fee
                  ? Math.round(((otherCourse.actualFee - otherCourse.fee) / otherCourse.actualFee) * 100)
                  : null;

                const isGoalMatch = otherCourse.targetExam === targetGoal || !otherCourse.targetExam;

                return (
                  <div
                    key={cId}
                    className="flex flex-col rounded-3xl overflow-hidden border border-gray-200/80 bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#0B132B] group"
                  >
                    {/* Header Banner */}
                    <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-[#0B132B] via-[#111C3A] to-[#1E293B] text-white relative">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {isGoalMatch && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B] flex items-center gap-1 shadow-sm">
                            <Sparkles size={11} /> Preference Match
                          </span>
                        )}
                        {otherCourse.targetExam && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 uppercase tracking-wider">
                            {otherCourse.targetExam}
                          </span>
                        )}
                        {otherCourse.targetClass && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                            {otherCourse.targetClass}
                          </span>
                        )}
                        {otherCourse.badge && (
                          <span className="ml-auto text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-900">
                            {otherCourse.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-black text-lg leading-tight mb-1 line-clamp-2">
                        {otherCourse.name}
                      </h3>
                      <p className="text-gray-300 text-xs line-clamp-1">
                        {otherCourse.subtitle || otherCourse.description || 'Structured comprehensive exam batch.'}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex flex-col p-6 justify-between space-y-5">
                      
                      {/* Features */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Batch Highlights</p>
                        <ul className="space-y-1.5">
                          {(otherCourse.features || [
                            "Interactive Live Classes & HD Recordings",
                            "Daily DPPs with Video Solutions",
                            "All India Test Series (AITS) CBT",
                            "24/7 Verified Doubt Assistance"
                          ]).slice(0, 3).map((f: string, fi: number) => (
                            <li key={fi} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight font-medium line-clamp-1">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Footer / Pricing & CTA */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            {otherCourse.actualFee && otherCourse.actualFee > (otherCourse.fee || 0) && (
                              <span className="text-xs font-bold text-gray-400 line-through">
                                ₹{otherCourse.actualFee.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xl font-black text-[#0B132B]">
                              ₹{otherCourse.fee?.toLocaleString() || 0}
                            </span>
                          </div>
                          {otherDiscount && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              Save {otherDiscount}%
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            router.push(`/student/course/${cId}`);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] text-[#C99A2E] font-black text-xs transition-all shadow-sm flex items-center gap-1.5 group-hover:scale-105"
                        >
                          <span>Explore Batch</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      <AnimatePresence>
        {showPayment && <EasebuzzPaymentModal course={course} onClose={() => setShowPayment(false)} onAuthError={handleAuthError} />}
      </AnimatePresence>
    </div>
  );
}
