"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, GraduationCap, Video, FileText, MessageSquare, Star } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const features = [
  { icon: Video, text: "Conduct live classes & sessions" },
  { icon: FileText, text: "Upload study materials & DPPs" },
  { icon: MessageSquare, text: "Answer doubts & engage students" },
  { icon: Star, text: "Track student performance & results" },
];

export default function TeacherLogin() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'teacher' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      
      toast.success('OTP sent to your email!');
      setShowOtpInput(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) { toast.error('Please enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role: 'teacher' }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      const payload = data.data || data;
      const { tokens, user, token } = payload;
      
      if (tokens?.access) localStorage.setItem('token', tokens.access.token);
      else if (token) localStorage.setItem('token', token);
      
      if (user) localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Welcome back, Teacher!');
      
      if (user && ['teacher', 'TEACHER'].includes(user.role)) {
        router.push('/teacher/dashboard');
      } else {
        toast.error('Unauthorized: Teacher access only.');
        localStorage.clear();
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f6fa' }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0f4c1f 0%, #1a7a35 40%, #0f6b5e 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 border border-white" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-1.5">
              <Image src="/SKD-logo.png" alt="SKD" width={48} height={48} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="text-white font-black text-xl leading-tight">SKD Xpress</p>
              <p className="text-white/50 text-xs font-medium">Institute Management System</p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <GraduationCap size={13} className="text-green-300" />
            <span className="text-white/80 text-xs font-medium">Teacher Portal</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Empower Your<br />
            <span style={{ color: '#6ee7b7' }}>Students</span> Today
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-sm">
            Your complete teaching toolkit — live classes, materials, assignments, doubts, and performance insights.
          </p>

          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <f.icon size={15} className="text-white" />
                </div>
                <span className="text-white/70 text-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs">© 2026 SKD Institute. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-gray-200 shadow-sm p-1">
              <Image src="/SKD-logo.png" alt="SKD" width={40} height={40} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">SKD Xpress</p>
              <p className="text-xs text-gray-400">Teacher Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Teacher Sign In</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the teacher dashboard</p>
          </div>

          <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} className="space-y-5">
            {/* Email */}
            {!showOtpInput && (
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="teacher@skdinstitute.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>
            )}

            {/* OTP */}
            {showOtpInput && (
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Enter OTP</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all text-sm font-medium tracking-widest text-center"
                    required
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowOtpInput(false)}
                  className="text-xs text-green-600 mt-2 hover:underline"
                >
                  Change Email
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #1a7a35, #0f6b5e)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {showOtpInput ? 'Verifying...' : 'Sending OTP...'}
                </>
              ) : (
                <>
                  <GraduationCap size={16} />
                  {showOtpInput ? 'Sign In to Teacher Portal' : 'Request OTP'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-100">
            <p className="text-xs text-green-700 font-medium text-center">🎓 This portal is exclusively for SKD Institute faculty members.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
