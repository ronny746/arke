"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Clock, CheckCircle2, Trophy, ArrowRight, ArrowLeft, X, Loader2, LogOut } from 'lucide-react';
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
        
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl">
              ₹
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Course Checkout</h3>
              <p className="text-xs text-blue-200 font-medium">Secured by Easebuzz Gateway</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 sm:p-7">
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-5 mb-6 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Selected Course</span>
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
            className="w-full py-4 rounded-2xl text-white font-black text-base transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0033a0, #4f46e5)' }}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Connecting to Gateway...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{course.fee?.toLocaleString() || 0} via Easebuzz</span>
                <ArrowRight size={18} />
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

export default function CourseDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth & Modals State
  const [user, setUser] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  
  const router = useRouter();

  // Load User & Course
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
          // Check if any of the user's batches belong to this course
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

  const handleAuthError = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowPayment(false);
    toast.error('Please login to continue.');
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Course not found</div>;

  const color = course.color || '#0033a0';

  return (
    <div className="font-sans pb-20 fade-in">
      <main className="max-w-7xl mx-auto pt-4">
        <button onClick={() => router.push('/student/dashboard')} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Details */}
          <div className="lg:w-2/3 space-y-6 sm:space-y-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-indigo-900 rounded-3xl p-8 sm:p-10 lg:p-12 shadow-2xl" style={{ backgroundImage: `linear-gradient(135deg, #111827, ${color || '#0033a0'})` }}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.07] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                <BookOpen size={300} className="text-white" />
              </div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {course.badge && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-md bg-white/20 backdrop-blur-md border border-white/30">
                      {course.badge}
                    </span>
                  )}
                  {course.tag && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-black/30 text-white backdrop-blur-md border border-white/10">
                      {course.tag}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 drop-shadow-xl">
                  {course.name}
                </h1>
                {course.subtitle && (
                  <p className="text-lg sm:text-xl text-white/90 font-medium leading-relaxed max-w-2xl drop-shadow-md">
                    {course.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
              <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <BookOpen size={200} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gray-50 border-2 border-gray-100">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
                </div>
                About this course
              </h2>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed font-medium relative z-10 whitespace-pre-wrap">
                {course.description || "The ultimate preparation program carefully designed by top educators to help you achieve your goals with structured learning."}
              </p>
            </div>

            {course.features?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-gray-200 transition-colors">
                <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <CheckCircle2 size={200} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-8 flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gray-50 border-2 border-gray-100">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
                  </div>
                  What you will get
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                  {course.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100/50 hover:bg-gray-100/80 transition-colors">
                      <div className="mt-0.5 bg-white rounded-full shadow-sm shrink-0"><CheckCircle2 size={20} style={{ color }} /></div>
                      <span className="text-gray-700 font-semibold leading-snug text-sm sm:text-base">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {course.bestFor?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-sm">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 sm:mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gray-50 border-2 border-gray-100">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
                  </div>
                  Best Suited For
                </h2>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {course.bestFor.map((bf: string, idx: number) => (
                    <span key={idx} className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gray-50 border-2 border-gray-100 text-xs sm:text-sm font-black text-gray-700 hover:border-gray-200 transition-colors">
                      {bf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing & Checkout Card */}
          <div className="lg:w-1/3">
            <div className="sticky top-24 bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${color}, #0033a0)` }} />
              <div className="p-6 sm:p-8">
                
                <div className="mb-8">
                  <span className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Course Fee</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    {course.actualFee && (
                      <span className="text-2xl sm:text-3xl font-bold text-gray-400 line-through tracking-tight">₹{course.actualFee?.toLocaleString()}</span>
                    )}
                    <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">₹{course.fee?.toLocaleString() || 0}</span>
                    <span className="text-gray-500 font-medium ml-1">/ full course</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                      <Clock size={18} className="text-gray-400" /> Duration
                    </div>
                    <span className="font-bold text-gray-900">{calculateDuration(course.startDate, course.endDate, course.duration)}</span>
                  </div>
                  
                  {/* Access Highlights */}
                  {course.access && (
                    <div className="grid grid-cols-2 gap-3">
                      {course.access.liveClasses && (
                         <div className="p-3 rounded-xl bg-green-50/80 border border-green-100 text-center shadow-sm">
                           <span className="text-[10px] sm:text-xs font-black text-green-700 uppercase tracking-widest">LIVE CLASSES</span>
                         </div>
                      )}
                      {course.access.testSeries && (
                         <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-center shadow-sm">
                           <span className="text-[10px] sm:text-xs font-black text-blue-700 uppercase tracking-widest">TEST SERIES</span>
                         </div>
                      )}
                      {course.access.studyMaterials && (
                         <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100 text-center shadow-sm">
                           <span className="text-[10px] sm:text-xs font-black text-purple-700 uppercase tracking-widest">MATERIALS</span>
                         </div>
                      )}
                      {course.access.dpps && (
                         <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-100 text-center shadow-sm">
                           <span className="text-[10px] sm:text-xs font-black text-orange-700 uppercase tracking-widest">DAILY DPPS</span>
                         </div>
                      )}
                    </div>
                  )}
                </div>

                {isEnrolled ? (
                  <button disabled
                    className="w-full py-4 rounded-xl text-white font-black text-lg shadow-xl flex items-center justify-center gap-2 opacity-90 cursor-default"
                    style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}>
                    <CheckCircle2 size={20} /> Successfully Enrolled
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
                  <button onClick={() => router.push(`/${user.role || 'student'}/profile`)}
                    className="w-full py-4 rounded-xl text-white font-black text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 group"
                    style={{ background: `linear-gradient(135deg, #ef4444, #b91c1c)` }}>
                    Complete Profile to Enroll
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button onClick={handleBuyClick}
                    className="w-full py-4 rounded-xl text-white font-black text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 group"
                    style={{ background: `linear-gradient(135deg, ${color}, #0033a0)`, boxShadow: `0 12px 30px ${color}30` }}>
                    {user ? 'Enroll Now' : 'Login to Enroll'} 
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                
                <p className="text-xs text-center text-gray-400 font-medium mt-5 flex items-center justify-center gap-1.5">
                  <Shield size={14} /> Secure checkout powered by SKD Pay
                </p>

              </div>
            </div>
          </div>
          
        </div>
      </main>

      <AnimatePresence>
        {showPayment && <EasebuzzPaymentModal course={course} onClose={() => setShowPayment(false)} onAuthError={handleAuthError} />}
      </AnimatePresence>
    </div>
  );
}

// Shield Icon used in checkout footer
function Shield(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
