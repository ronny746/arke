"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  RefreshCw,
  X,
  Loader2,
  BookOpen,
  Award,
  Video,
  FileText,
  HelpCircle,
  Clock,
  Shield,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginModal } from '@/components/LoginModal';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  return fallback || 'Full Academic Session';
};

export default function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const initialCourseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (uStr) {
      try { setUser(JSON.parse(uStr)); } catch (e) {}
    }

    if (initialCourseId) {
      fetchCourseData(initialCourseId);
    }
    fetchAllCourses();
  }, [initialCourseId]);

  const fetchCourseData = async (cId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/public/courses/${cId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCourse(data.data);
      } else {
        toast.error(data.message || 'Failed to load course details');
      }
    } catch (err) {
      toast.error('Could not fetch course information');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const res = await fetch('/api/v1/public/courses');
      const data = await res.json();
      if (res.ok && data.success) {
        setAllCourses(data.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch course catalog:', err);
    }
  };

  const handleSelectUpgrade = (selectedCourse: any) => {
    setCourse(selectedCourse);
    setShowUpgradeModal(false);
    toast.success(`Switched checkout to "${selectedCourse.name}"`);
  };

  const handlePayNow = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    if (!course) return;

    setPaying(true);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const res = await fetch('/api/v1/payments/razorpay/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId: course._id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401 || data.message?.toLowerCase().includes('token') || data.message?.toLowerCase().includes('auth')) {
          setShowLoginModal(true);
          return;
        }
        throw new Error(data.message || 'Payment initiation failed');
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: "ARKE Scholars",
        description: data.course?.name || course.name || "Course Enrollment",
        order_id: data.orderId,
        prefill: {
          name: data.user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: data.user?.email || user?.email || '',
          contact: data.user?.phone || user?.phone || ''
        },
        theme: {
          color: "#0B132B"
        },
        handler: async function (response: any) {
          toast.loading('Verifying payment signature...');
          try {
            const verifyRes = await fetch('/api/v1/payments/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: course._id
              })
            });
            const verifyData = await verifyRes.json();
            toast.dismiss();
            if (verifyData.success) {
              toast.success('Payment successful! Course enrolled.');
              router.push(`/payment/status?status=success&txnid=${response.razorpay_order_id}&courseId=${course._id}`);
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
              setPaying(false);
            }
          } catch (vErr: any) {
            toast.dismiss();
            toast.error(vErr.message || 'Verification error');
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setPaying(false);
    }
  };

  const originalFee = course?.actualFee || (course?.fee ? Math.round(course.fee * 1.25) : 0);
  const discountPercent = originalFee > (course?.fee || 0)
    ? Math.round(((originalFee - course.fee) / originalFee) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0B132B] flex items-center justify-center text-[#C99A2E] animate-bounce shadow-xl">
            <BookOpen size={24} />
          </div>
          <p className="text-sm font-semibold text-gray-600">Loading Order Summary...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <X size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Course Not Found</h2>
          <p className="text-xs text-gray-500">The course you are attempting to checkout is invalid or no longer active.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl bg-[#0B132B] text-white font-bold text-sm hover:bg-[#1C2541] transition-all"
          >
            Browse All Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-b border-white/10 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            <span>Back to Course</span>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image src="/arke_logo.png" alt="ARKE Scholars" width={120} height={40} className="h-8 w-auto object-contain" priority />
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#C99A2E] bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <ShieldCheck size={16} className="text-[#C99A2E]" />
            <span className="hidden sm:inline">256-Bit SSL Secured</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Title Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#0B132B] text-xs font-bold mb-2">
              <Sparkles size={14} className="text-[#C99A2E]" />
              <span>Final Enrollment Step</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B132B] tracking-tight">Review Order & Complete Enrollment</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Verify your selected course details and unlock instant batch access upon payment.</p>
          </div>

          {/* Change or Upgrade Button */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-[#0B132B] hover:shadow-md text-xs font-bold text-[#0B132B] transition-all group shrink-0"
          >
            <RefreshCw size={15} className="text-[#C99A2E] group-hover:rotate-180 transition-transform duration-500" />
            <span>Switch / Upgrade Course</span>
          </button>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Course Details & Highlights */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Course Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-blue-600/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#0B132B] text-[#C99A2E]">
                    {course.targetExam || 'IIT-JEE / NEET'}
                  </span>
                  {course.targetClass && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                      Class {course.targetClass}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
                >
                  Change
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-3">
                {course.name}
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6 line-clamp-3">
                {course.description || 'Comprehensive interactive learning program with live classes, structured study material, regular assessments, and expert doubt resolution.'}
              </p>

              {/* Quick Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Duration</span>
                  <span className="text-xs font-black text-gray-900 mt-0.5 flex items-center gap-1">
                    <Clock size={13} className="text-[#C99A2E]" />
                    {calculateDuration(course.startDate, course.endDate, 'Full Academic Year')}
                  </span>
                </div>

                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Language</span>
                  <span className="text-xs font-black text-gray-900 mt-0.5 flex items-center gap-1">
                    <BookOpen size={13} className="text-[#C99A2E]" />
                    {course.language || 'Hinglish / English'}
                  </span>
                </div>

                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mode</span>
                  <span className="text-xs font-black text-gray-900 mt-0.5 flex items-center gap-1">
                    <Video size={13} className="text-[#C99A2E]" />
                    Live & Recorded
                  </span>
                </div>
              </div>
            </div>

            {/* Included Features Checklist */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-gray-100 space-y-4">
              <h3 className="font-bold text-[#0B132B] text-base flex items-center gap-2">
                <Award size={18} className="text-[#C99A2E]" />
                <span>Everything Included in Your Subscription</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {[
                  { icon: Video, title: 'Interactive Live Classes', desc: 'Real-time lectures with active Q&A' },
                  { icon: FileText, title: 'DPPs & Study Modules', desc: 'Daily practice sheets with video solutions' },
                  { icon: Award, title: 'All-India Test Series', desc: 'Rank analysis & exam-level tests' },
                  { icon: HelpCircle, title: 'Dedicated Doubt Support', desc: 'Get doubts cleared by expert faculty' },
                  { icon: BookOpen, title: 'Recorded Class Vault', desc: 'Access 24/7 lectures for revision' },
                  { icon: ShieldCheck, title: 'Official Certificate & Analytics', desc: 'Track progress with performance metrics' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Banner Card */}
            <div className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] rounded-3xl p-6 text-white flex items-center justify-between gap-4 shadow-xl border border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C99A2E]">Need A Different Program?</span>
                <h4 className="font-bold text-base text-white">Explore Other Batches & Target Programs</h4>
                <p className="text-xs text-white/70">Compare fee, faculty, and schedules before confirming payment.</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#C99A2E] text-[#0B132B] font-black text-xs hover:bg-amber-400 transition-colors shrink-0 shadow-md"
              >
                Upgrade / Switch
              </button>
            </div>

          </div>

          {/* Right Column: Order Summary & Checkout Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-gray-100 sticky top-24 space-y-6">
              
              <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Order Summary</h3>
                  <p className="text-xs text-gray-400">Fee Breakdown & Payment Details</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#C99A2E] flex items-center justify-center font-black text-base">
                  ₹
                </div>
              </div>

              {/* Price Calculation */}
              <div className="space-y-3 text-xs">
                {originalFee > (course.fee || 0) && (
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Base Course Fee</span>
                    <span className="line-through text-gray-400 font-semibold">₹{originalFee.toLocaleString()}</span>
                  </div>
                )}

                {discountPercent > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                    <span>Limited Time Discount ({discountPercent}% OFF)</span>
                    <span>- ₹{(originalFee - course.fee).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-500">
                  <span>GST & Access Taxes</span>
                  <span className="font-semibold text-emerald-600">INCLUDED</span>
                </div>

                <div className="pt-3 border-t border-gray-200 border-dashed flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Net Payable Amount</span>
                    <span className="text-[10px] text-gray-400">All taxes & study portal access included</span>
                  </div>
                  <span className="text-3xl font-black text-[#0B132B]">
                    ₹{course.fee?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              {/* User Account Info */}
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Student Account</span>
                {user ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-[11px] text-gray-500">{user.email || user.phone}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Logged In</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 font-medium">Guest Checkout</p>
                    <button onClick={() => setShowLoginModal(true)} className="text-[#2563eb] font-bold hover:underline">Log in</button>
                  </div>
                )}
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="w-full py-4 rounded-2xl text-white font-black text-base transition-all shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group"
                style={{ background: 'linear-gradient(135deg, #0B132B, #1C2541)' }}
              >
                {paying ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-[#C99A2E]" />
                    <span>Opening Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{course.fee?.toLocaleString() || 0}</span>
                    <ArrowRight size={18} className="text-[#C99A2E] group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="pt-2 text-center space-y-2">
                <p className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
                  <Shield size={13} className="text-emerald-600" /> Authorized Razorpay Payment Aggregator
                </p>
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  <span>UPI</span> • <span>Google Pay</span> • <span>PhonePe</span> • <span>Cards</span> • <span>Netbanking</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Upgrade / Change Course Slide-over Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="bg-[#0B132B] text-white p-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C99A2E]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Select / Upgrade Course</h3>
                    <p className="text-xs text-white/70">Choose an alternative batch to switch your checkout</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Course Catalog List */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {allCourses.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">Loading course list...</div>
                ) : (
                  allCourses.map((item) => {
                    const isSelected = item._id === course?._id;
                    const itemDiscount = item.actualFee && item.actualFee > item.fee
                      ? Math.round(((item.actualFee - item.fee) / item.actualFee) * 100)
                      : 0;

                    return (
                      <div
                        key={item._id}
                        onClick={() => handleSelectUpgrade(item)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-[#0B132B] bg-amber-50/40 shadow-md ring-2 ring-[#0B132B]/20'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0B132B] text-[#C99A2E]">
                              {item.targetExam || 'General'}
                            </span>
                            {item.targetClass && (
                              <span className="text-[10px] font-bold text-gray-500">
                                Class {item.targetClass}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                                <Check size={12} /> Currently Selected
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.description || 'Full academic course program.'}</p>
                        </div>

                        <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <div className="text-right">
                            <span className="text-lg font-black text-gray-900 block">₹{item.fee?.toLocaleString() || 0}</span>
                            {itemDiscount > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 block">
                                {itemDiscount}% OFF
                              </span>
                            )}
                          </div>
                          <button
                            className={`mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-[#0B132B] text-[#C99A2E]'
                                : 'bg-gray-100 hover:bg-[#0B132B] hover:text-white text-gray-800'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Switch to This'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
