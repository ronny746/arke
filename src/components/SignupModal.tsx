"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, CheckCircle2, User, Phone, Mail, MapPin, Building, GraduationCap, Image as ImageIcon, ChevronDown, Search } from "lucide-react";
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export function SignupModal({ isOpen, onClose, onSwitchToLogin, redirectOnSuccess = true }: { isOpen: boolean; onClose: () => void; onSwitchToLogin?: () => void; redirectOnSuccess?: boolean }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    otp: "",
    email: "",
    studentClass: "",
    state: "",
    city: "",
    photo: null as File | null,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const handleSendOtp = async () => {
    if (formData.phone.length === 10) {
      setIsSendingOtp(true);
      try {
        const res = await fetch('/api/v1/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileNumber: formData.phone, isSignup: true })
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



  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, photo: e.target.files[0] });
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
          phone: formData.phone,
          otp: formData.otp,
          isSignup: true,
          name: formData.name,
          email: formData.email,
          studentClass: formData.studentClass,
          state: formData.state,
          city: formData.city
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        toast.success(data.message || "Registration successful!");
        onClose();
        if (redirectOnSuccess) {
          window.location.href = '/student/dashboard';
        }
      } else {
        toast.error(data.message || "Invalid OTP or Registration Failed");
      }
    } catch (err) {
      toast.error("Something went wrong during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setIsStateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                  <h3 className="text-3xl font-black mb-3 leading-tight">Start Your<br/>Journey Today</h3>
                  <p className="text-white/80 text-sm mb-8 leading-relaxed">Join 5,000+ top NEET aspirants and unlock a world-class learning experience with SKD Xpress.</p>
                  
                  <div className="space-y-4">
                    {[
                      "Daily Live Interactive Classes",
                      "AI-Powered Analytics",
                      "Unlimited Mock Tests",
                      "1-on-1 Doubt Solving"
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

                <div className="relative z-10 mt-10">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#7b3fa0] bg-gray-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Student" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/80 mt-2 font-medium">Join our community of achievers</p>
                </div>
              </div>

              {/* Right Panel (Form) */}
              <div className="w-full md:w-3/5 p-8 max-h-[85vh] overflow-y-auto">
                <div className="max-w-md mx-auto">
                  <h4 className="text-2xl font-black text-gray-900 mb-1">Create Account</h4>
                  <p className="text-gray-500 text-sm mb-8">Enter your details to get 7-day free access.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

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
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium disabled:opacity-60"
                            placeholder="10-digit number"
                          />
                        </div>
                        {(!otpSent || isSendingOtp) && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={formData.phone.length !== 10 || isSendingOtp}
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
                      <AnimatePresence>
                        {otpSent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex gap-2 overflow-hidden"
                          >
                            <input
                              type="text"
                              value={formData.otp}
                              onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                              className="block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium text-center tracking-widest"
                              placeholder="Enter 6-digit OTP"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Class & State */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Class</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <GraduationCap className="w-4 h-4 text-gray-400" />
                          </div>
                          <select
                            required
                            value={formData.studentClass}
                            onChange={(e) => setFormData({...formData, studentClass: e.target.value})}
                            className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium appearance-none"
                          >
                            <option value="" disabled>Select</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                            <option value="repeater">Repeater</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">State</label>
                        <div className="relative" ref={stateDropdownRef}>
                          <div 
                            onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                            className="block w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium cursor-pointer flex items-center justify-between"
                          >
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="w-4 h-4 text-gray-400" />
                            </div>
                            <span className={formData.state ? "text-gray-900" : "text-gray-400"}>
                              {formData.state || "Select State"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isStateDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>
                          
                          <AnimatePresence>
                            {isStateDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                              >
                                <div className="p-2 border-b border-gray-100 relative">
                                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                  <input 
                                    type="text" 
                                    placeholder="Search state..."
                                    value={stateSearch}
                                    onChange={(e) => setStateSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())).length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No states found</div>
                                  ) : (
                                    INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())).map((state) => (
                                      <div
                                        key={state}
                                        onClick={() => {
                                          setFormData({ ...formData, state });
                                          setIsStateDropdownOpen(false);
                                          setStateSearch("");
                                        }}
                                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${formData.state === state ? 'bg-[#0033a0]/5 text-[#0033a0] font-bold' : 'text-gray-700 font-medium'}`}
                                      >
                                        {state}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">City</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Building className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0033a0]/20 focus:border-[#0033a0] transition-all font-medium"
                          placeholder="Your city"
                        />
                      </div>
                    </div>

                    {/* Photo Upload (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Profile Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-4 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#0033a0]/40 hover:bg-[#0033a0]/5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {formData.photo ? (
                            <img src={URL.createObjectURL(formData.photo)} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate">
                            {formData.photo ? formData.photo.name : "Upload Photo"}
                          </p>
                          <p className="text-[10px] text-gray-400">JPG, PNG up to 2MB</p>
                        </div>
                        <Upload className="w-4 h-4 text-gray-400 mr-2" />
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!otpSent || isLoading}
                      className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-md flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)" }}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Start Free Trial 🚀"
                      )}
                    </button>
                    
                    <p className="text-center text-[10px] text-gray-400 mt-3">
                      By proceeding, you agree to our Terms and Privacy Policy.
                    </p>
                    
                    {onSwitchToLogin && (
                      <p className="text-center text-sm font-semibold text-gray-600 mt-6 pt-6 border-t border-gray-100">
                        Already have an account?{" "}
                        <button type="button" onClick={() => { onClose(); onSwitchToLogin(); }} className="text-[#e8470a] hover:underline">
                          Log In
                        </button>
                      </p>
                    )}
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
