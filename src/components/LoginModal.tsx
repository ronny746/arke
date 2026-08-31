"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Phone, GraduationCap } from "lucide-react";
import toast from 'react-hot-toast';

export function LoginModal({ isOpen, onClose, onSwitchToSignup, redirectOnSuccess = true }: { isOpen: boolean; onClose: () => void; onSwitchToSignup?: () => void; redirectOnSuccess?: boolean }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("student");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [enableRollNumber, setEnableRollNumber] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/public-settings')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setEnableRollNumber(data.data.enableRollNumberLogin);
          }
        })
        .catch(err => console.error("Failed to fetch public settings", err));
    }
  }, [isOpen]);

  const handleSendOtp = async () => {
    if (phone.length === 10) {
      setIsSendingOtp(true);
      try {
        const res = await fetch('/api/v1/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileNumber: phone })
        });
        const data = await res.json();
        if (data.success) {
          setOtpSent(true);
          toast.success(data.message || "OTP sent successfully!");
        } else {
          toast.error(data.message || "Failed to send OTP");
        }
      } catch (err) {
        toast.error("Something went wrong while sending OTP.");
      } finally {
        setIsSendingOtp(false);
      }
    } else {
      toast.error("Please enter a valid 10-digit mobile number.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          otp: otp,
          role: role
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        toast.success(data.message || "Login successful!");
        onClose();
        if (redirectOnSuccess) {
          if (typeof redirectOnSuccess === 'string') {
             window.location.href = redirectOnSuccess;
          } else if (data.data.user.role === 'parent') {
            window.location.href = '/parent/dashboard';
          } else {
            window.location.href = '/student/dashboard';
          }
        }
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      toast.error("Something went wrong during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative z-[101] my-8"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-black/10 backdrop-blur-md rounded-full text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Panel */}
              <div className="w-full md:w-2/5 p-8 text-white relative overflow-hidden hidden md:flex md:flex-col justify-between" style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)" }}>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/30">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-black mb-3 leading-tight">Welcome!</h3>
                  <p className="text-white/80 text-sm mb-8 leading-relaxed">Enter your mobile number to instantly log in or create a new account.</p>
                  
                  <div className="space-y-4">
                    {[
                      "Access your enrolled courses",
                      "View mock test results",
                      "Continue where you left off",
                      "Check live class schedules"
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center border border-white/30 flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel (Form) */}
              <div className="w-full md:w-3/5 p-8 flex flex-col justify-center min-h-[450px]">
                <div className="max-w-md mx-auto w-full">
                  <h4 className="text-2xl font-black text-gray-900 mb-1">Login / Register</h4>
                  <p className="text-gray-500 text-sm mb-6">Enter mobile number to login or create a new student account.</p>

                  <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'student' ? 'bg-white text-[#0033a0] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('parent')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'parent' ? 'bg-white text-[#0033a0] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Parent
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Phone & OTP */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium disabled:opacity-60"
                            placeholder="10-digit number"
                          />
                        </div>
                        {(!otpSent || isSendingOtp) && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={phone.length !== 10 || isSendingOtp}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                            style={{ background: "linear-gradient(135deg, #e8470a, #f76c2f)" }}
                          >
                            {isSendingOtp ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : "Send OTP"}
                          </button>
                        )}
                      </div>

                      {/* OTP Input Field */}
                      {(otpSent || (role === 'student' && enableRollNumber)) && (
                        <div className="flex gap-2 overflow-hidden mt-3">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.trim())}
                            className="block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium text-center tracking-widest uppercase"
                            placeholder={role === 'student' && enableRollNumber ? "Enter 6-digit OTP or Roll Number" : "Enter 6-digit OTP"}
                          />
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!otp || isLoading}
                      className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-md mt-6 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)" }}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Login / Register 🚀"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
