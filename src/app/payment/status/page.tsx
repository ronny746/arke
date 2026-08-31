"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, XCircle, Clock, ArrowRight, Home, RefreshCw, BookOpen, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusParam = searchParams.get('status') || 'pending';
  const txnid = searchParams.get('txnid') || '';
  const easepayid = searchParams.get('easepayid') || '';
  const courseId = searchParams.get('courseId') || '';
  const initialAmount = searchParams.get('amount') || '';
  const errorMessage = searchParams.get('message') || '';

  const [loading, setLoading] = useState(true);
  const [txnData, setTxnData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(statusParam.toLowerCase());

  useEffect(() => {
    if (!txnid) {
      setLoading(false);
      return;
    }

    let pollCount = 0;
    const maxPolls = 5;

    const checkStatus = () => {
      fetch(`/api/v1/payments/status/${txnid}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setTxnData(data.data);
            if (data.data.status) {
              const newStatus = data.data.status.toLowerCase();
              setCurrentStatus(newStatus);
              if (['success', 'successful', 'userpaid', 'user_paid'].includes(newStatus)) {
                return; // Stop polling on success
              }
            }
          }
        })
        .catch(err => {
          console.error('Error fetching payment status:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    checkStatus();

    // Auto-poll up to 5 times every 2.5s for UPI mobile return delays
    const interval = setInterval(() => {
      pollCount++;
      if (pollCount >= maxPolls) {
        clearInterval(interval);
      } else {
        checkStatus();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [txnid]);

  const [countdown, setCountdown] = useState<number>(4);

  const isSuccess = ['success', 'successful', 'userpaid', 'user_paid'].includes(currentStatus);
  const isFailed = ['failed', 'failure', 'usercancelled', 'user_cancelled'].includes(currentStatus);
  const isPending = !isSuccess && !isFailed;

  const targetCourseId = courseId || txnData?.courseId?._id || txnData?.courseId;

  // Auto-redirect to course page upon successful payment
  useEffect(() => {
    if (!isSuccess || !targetCourseId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to enrolled course
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          const destination = user?.role === 'student' ? `/student/course/${targetCourseId}` : `/course/${targetCourseId}`;
          router.push(destination);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, targetCourseId, router]);

  const displayAmount = txnData?.amountPaid || initialAmount;
  const courseName = txnData?.courseId?.name || 'Enrolled Course';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/SKD-logo.png" alt="SKD Institute" width={130} height={45} className="h-9 w-auto object-contain" priority />
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Easebuzz Secured</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden"
        >
          {/* Status Header Banner */}
          <div
            className={`p-8 text-center text-white ${
              isSuccess
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                : isFailed
                ? 'bg-gradient-to-br from-red-600 to-rose-700'
                : 'bg-gradient-to-br from-amber-500 to-orange-600'
            }`}
          >
            <div className="flex justify-center mb-4">
              {isSuccess ? (
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center ring-8 ring-white/10">
                  <CheckCircle2 size={44} className="text-white" />
                </div>
              ) : isFailed ? (
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center ring-8 ring-white/10">
                  <XCircle size={44} className="text-white" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center ring-8 ring-white/10 animate-spin">
                  <Clock size={44} className="text-white" />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black mb-1">
              {isSuccess ? 'Payment Successful!' : isFailed ? 'Payment Failed' : 'Payment Processing'}
            </h1>
            <p className="text-sm text-white/80 font-medium">
              {isSuccess
                ? targetCourseId
                  ? `Your enrollment is confirmed! Redirecting to course in ${countdown}s...`
                  : 'Your enrollment has been confirmed successfully.'
                : isFailed
                ? errorMessage || 'The payment could not be completed.'
                : 'Please wait while we confirm your payment receipt.'}
            </p>
          </div>

          {/* Transaction Summary Card */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Amount Paid</span>
                <span className="text-xl font-black text-gray-900">
                  ₹{Number(displayAmount || 0).toLocaleString()}
                </span>
              </div>

              {courseName && (
                <div className="flex justify-between items-center text-sm border-t border-gray-200/60 pt-3">
                  <span className="text-gray-500 font-medium">Course</span>
                  <span className="font-bold text-gray-800 text-right max-w-[200px] truncate">
                    {courseName}
                  </span>
                </div>
              )}

              {txnid && (
                <div className="flex justify-between items-center text-xs border-t border-gray-200/60 pt-3">
                  <span className="text-gray-500 font-medium">Order ID</span>
                  <span className="font-mono text-gray-700 font-bold">{txnid}</span>
                </div>
              )}

              {easepayid && (
                <div className="flex justify-between items-center text-xs border-t border-gray-200/60 pt-3">
                  <span className="text-gray-500 font-medium">Easebuzz Pay ID</span>
                  <span className="font-mono text-gray-700 font-bold">{easepayid}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs border-t border-gray-200/60 pt-3">
                <span className="text-gray-500 font-medium">Payment Mode</span>
                <span className="font-semibold text-gray-700">Easebuzz Gateway</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isSuccess ? (
                <>
                  {courseId ? (
                    <Link
                      href={`/student/course/${courseId}`}
                      className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} />
                      Go to Course
                      <ArrowRight size={16} />
                    </Link>
                  ) : null}
                  <Link
                    href="/student/dashboard"
                    className="w-full py-3.5 px-4 rounded-xl text-emerald-800 font-bold text-sm bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    Go to Student Dashboard
                  </Link>
                </>
              ) : isFailed ? (
                <>
                  {courseId ? (
                    <Link
                      href={`/course/${courseId}`}
                      className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Retry Payment
                    </Link>
                  ) : null}
                  <Link
                    href="/"
                    className="w-full py-3.5 px-4 rounded-xl text-gray-700 font-bold text-sm bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Home size={18} />
                    Return to Home
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Refresh Status
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        SKD New Standard Coaching Institute • Secured by Easebuzz Payment Gateway
      </footer>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
