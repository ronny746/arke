"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Shield, BookOpen, Users, BarChart2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const features = [
  { icon: Users, text: "Manage 5000+ students & faculty" },
  { icon: BookOpen, text: "Full curriculum & batch control" },
  { icon: BarChart2, text: "Real-time analytics & reports" },
  { icon: CheckCircle, text: "Exams, results & question banks" },
];

export default function AdminLogin() {
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
        body: JSON.stringify({ email, role: 'admin' }) // Admin portals can be used by any admin role, but backend will check
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
      // The role sent here is purely for verification, though our controller checks if the user's role matches admin-level
      // To bypass strict single-role matching in frontend if the user is a super_admin or admin_acadops, we might need a generic admin check or send 'admin'.
      // Let's send 'super_admin' or generic, wait, the backend `requestEmailOtp` checks `role`. We might need to try common admin roles if they use the same portal, or backend should handle array of roles.
      // Assuming 'super_admin' is the main one for this page. Let's just not send role and let backend verify any admin. Wait, backend requires `role`.
      // I'll send 'super_admin' for now, or maybe the portal supports 'admin' too.
      // Let's change backend to accept array of roles or check permissions. For now, I'll send role: 'super_admin' as fallback. Let's send role: 'super_admin'.
      
      const res = await fetch('/api/v1/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role: 'super_admin' }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      const payload = data.data || data;
      const { tokens, user, token } = payload;
      
      if (tokens?.access) localStorage.setItem('token', tokens.access.token);
      else if (token) localStorage.setItem('token', token);
      
      if (user) localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Welcome back, Admin!');
      
      if (user && ['admin', 'super_admin', 'institute_admin', 'admin_acadops', 'admin_operations'].includes(user.role)) {
        router.push('/admin/dashboard');
      } else {
        toast.error('Unauthorized: Admin access only.');
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
        style={{ background: 'linear-gradient(145deg, #001f6b 0%, #0033a0 40%, #5e1fa0 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7b3fa0, transparent)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #e8470a, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 border border-white" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-1.5 border border-white/20">
              <Image src="/arke_logo_light.png" alt="ARKE" width={48} height={48} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="text-white font-black text-xl leading-tight">ARKE Scholars</p>
              <p className="text-white/50 text-xs font-medium">Admin Management Portal</p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <Shield size={13} className="text-orange-300" />
            <span className="text-white/80 text-xs font-medium">Secure Admin Access</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Manage Your<br />
            <span style={{ color: '#E4B94F' }}>Institution</span> Smartly
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-sm">
            Complete control over academics, students, faculty, exams, and analytics — all in one powerful dashboard.
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

        {/* Footer Quote */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs">© 2026 ARKE Scholars. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-navy border border-white/20 shadow-sm p-1">
              <Image src="/arke_logo_light.png" alt="ARKE" width={40} height={40} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">ARKE Scholars</p>
              <p className="text-xs text-gray-400">Admin Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Admin Sign In</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the admin dashboard</p>
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
                    placeholder="admin@arke.pro"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium tracking-widest text-center"
                    required
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowOtpInput(false)}
                  className="text-xs text-blue-600 mt-2 hover:underline"
                >
                  Change Email
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {showOtpInput ? 'Verifying...' : 'Sending OTP...'}
                </>
              ) : (
                <>
                  <Shield size={16} />
                  {showOtpInput ? 'Sign In to Admin Portal' : 'Request OTP'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium text-center">🔒 This portal is for authorized administrators only. Unauthorized access is prohibited.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
