"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Pencil,
  Sparkles,
  Stethoscope,
  Zap,
  GraduationCap,
  BookOpen,
  Building2,
  Check,
  ShieldCheck,
  User,
  Mail,
  Compass,
  Layers,
  Globe
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  redirectOnSuccess?: boolean | string;
}

type PortalUser = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

const EXAM_GOALS = [
  {
    id: "NEET",
    title: "NEET UG",
    tagline: "Medical Entrance (MBBS / BDS)",
    icon: Stethoscope,
    color: "#059669"
  },
  {
    id: "IIT-JEE",
    title: "IIT JEE",
    tagline: "Engineering (Main & Advanced)",
    icon: Zap,
    color: "#2563EB"
  },
  {
    id: "BOARDS-11-12",
    title: "Class 11 & 12",
    tagline: "CBSE & State Board Prep",
    icon: GraduationCap,
    color: "#7C3AED"
  },
  {
    id: "FOUNDATION-9-10",
    title: "Class 9 & 10",
    tagline: "Foundation & Olympiads",
    icon: BookOpen,
    color: "#D97706"
  },
  {
    id: "CUET-GOVT",
    title: "CUET & Govt Exams",
    tagline: "Central Univ & Aptitude",
    icon: Building2,
    color: "#DC2626"
  }
];

const CLASSES = [
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Class 11", label: "Class 11" },
  { id: "Class 12", label: "Class 12" },
  { id: "Dropper", label: "12th Pass / Dropper" }
];

const MEDIUMS = [
  { id: "Hinglish", label: "Hinglish (Hindi + English)" },
  { id: "English", label: "English" },
  { id: "Hindi", label: "Hindi" }
];

export function LoginModal({ isOpen, onClose, redirectOnSuccess = true }: LoginModalProps) {
  // Step: 1 = registered mobile number, 2 = mobile OTP, 3 = student profile details.
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Auth States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated User Temp Storage
  const [authToken, setAuthToken] = useState<string>("");
  const [loggedInUser, setLoggedInUser] = useState<PortalUser | null>(null);

  // Preferences & Profile States (ARKE Profile Details)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("NEET");
  const [selectedClass, setSelectedClass] = useState("Class 11");
  const [selectedMedium, setSelectedMedium] = useState("Hinglish");

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setStep(1);
        setPhone("");
        setOtp("");
        setEmail("");
      });
    }
  }, [isOpen]);

  const handleContinue = (targetIdentifier = phone) => {
    const identifier = targetIdentifier.trim();
    const isValid = identifier.replace(/\D/g, "").length === 10;
    if (!isValid) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    const cleanPhone = identifier.replace(/\D/g, "").slice(-10);
    setPhone(cleanPhone);

    void requestMobileOtp(cleanPhone);
  };

  const requestMobileOtp = async (mobileNumber: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobileNumber, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "OTP could not be sent.");
      setStep(2);
      toast.success("OTP sent to your registered mobile number.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP could not be sent.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMobileOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "OTP verification failed.");
      completeAuthenticatedLogin(data, "Mobile verified! Please complete your profile details.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const completeAuthenticatedLogin = (data: { data: { token: string; user: PortalUser; isNewUser?: boolean }; message?: string }, profileMessage: string) => {
    const token = data.data.token;
    const user = data.data.user;
    const isNewUser = data.data.isNewUser;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setAuthToken(token);
    setLoggedInUser(user);

    if (user.firstName && user.firstName !== "Student") setFullName(`${user.firstName} ${user.lastName || ""}`.trim());
    const isDummyEmail = user.email && (user.email.includes("@arke.com") || user.email.startsWith("student_"));
    setEmail(user.email && !isDummyEmail ? user.email : "");
    if (typeof user.metadata?.targetExam === "string") setSelectedGoal(user.metadata.targetExam);
    if (typeof user.metadata?.studentClass === "string") setSelectedClass(user.metadata.studentClass);
    if (typeof user.metadata?.medium === "string") setSelectedMedium(user.metadata.medium);

    // Parents are linked and managed by the institute. They should enter the
    // parent portal immediately after a successful OTP sign-in, not be sent
    // through a student-course preference form.
    const needsDetails = user.role === "student" && (
      isNewUser || !user.firstName || user.firstName === "Student" || isDummyEmail || !user.metadata?.targetExam || user.metadata?.isProfileIncomplete === true
    );
    if (needsDetails) {
      setStep(3);
      toast.success(profileMessage);
    } else {
      toast.success(data.message || "Welcome back!");
      finalizeLogin(user);
    }
  };

  // Save Preferences & Complete Profile Handler (Step 3)
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Please enter a valid email address (e.g. yourname@gmail.com).");
      return;
    }

    setIsLoading(true);
    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || "Student";

      const updatedMetadata = {
        ...(loggedInUser?.metadata || {}),
        targetExam: selectedGoal,
        studentClass: selectedClass,
        medium: selectedMedium,
        isProfileIncomplete: false
      };

      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken || localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim(),
          metadata: updatedMetadata
        })
      });

      await res.json();

      const finalUser = {
        ...(loggedInUser || {}),
        firstName,
        lastName,
        email: email.trim(),
        metadata: updatedMetadata
      };

      localStorage.setItem("user", JSON.stringify(finalUser));
      toast.success("Profile setup complete! Welcome to ARKE Scholars 🚀");
      finalizeLogin(finalUser);
    } catch {
      toast.error("Starting your dashboard...");
      finalizeLogin(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeLogin = (user: PortalUser | null) => {
    onClose();
    if (redirectOnSuccess) {
      if (typeof redirectOnSuccess === "string") {
        window.location.href = redirectOnSuccess;
      } else if (user?.role === "parent") {
        window.location.href = "/parent/dashboard";
      } else if (user?.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/student/dashboard";
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 z-10 my-6"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col lg:flex-row min-h-[520px]">
              {/* Left Brand Panel */}
              <div
                className="lg:w-5/12 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0"
                style={{
                  background: "linear-gradient(135deg, #0B132B 0%, #111C3A 50%, #1C2541 100%)"
                }}
              >
                {/* Decorative Elements */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#C99A2E]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Logo */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Image
                      src="/arke_logo.png"
                      alt="ARKE Scholars"
                      width={140}
                      height={45}
                      className="h-9 w-auto object-contain brightness-110"
                      priority
                    />
                  </div>
                  <h3 className="text-2xl font-black text-white leading-tight mb-2">
                    India&apos;s Premier Learning Ecosystem
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Interactive live classes, Daily Practice Problems (DPPs), All India Test Series, and 24/7 Doubt Engine.
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="space-y-2.5 my-6 relative z-10">
                  <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-[#C99A2E] text-[#0B132B] flex items-center justify-center font-black text-xs shrink-0">
                      ✓
                    </div>
                    <span className="text-xs font-semibold text-gray-200">
                      Top Faculty for NEET, JEE & Boards
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-[#C99A2E] text-[#0B132B] flex items-center justify-center font-black text-xs shrink-0">
                      ✓
                    </div>
                    <span className="text-xs font-semibold text-gray-200">
                      NTA Pattern CBT Simulator & AIR
                    </span>
                  </div>
                </div>

                {/* Footer Assurance */}
                <div className="pt-4 border-t border-white/10 relative z-10 flex items-center gap-2 text-[11px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-[#C99A2E]" />
                  <span>Secure 256-bit encrypted authentication</span>
                </div>
              </div>

              {/* Right Interactive Form Area */}
              <div className="lg:w-7/12 p-6 sm:p-8 flex flex-col justify-center max-h-[85vh] overflow-y-auto">
                {/* ═══════════════════════════════════════════════════════════════
                    STEP 1: ENTER MOBILE NUMBER
                   ═══════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B132B]/5 text-[#0B132B] text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#C99A2E]" />
                        Secure sign in
                      </div>
                      <h4 className="text-2xl font-black text-[#0B132B] tracking-tight">Sign in to ARKE</h4>
                      <p className="text-gray-500 text-xs mt-1">
                        Use your registered mobile number and a one-time password.
                      </p>
                    </div>

                    {/* Role Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`py-2 text-xs font-black rounded-xl transition-all ${
                          role === "student"
                            ? "bg-white text-[#0B132B] shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Student Portal
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("parent")}
                        className={`py-2 text-xs font-black rounded-xl transition-all ${
                          role === "parent"
                            ? "bg-white text-[#0B132B] shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Parent Portal
                      </button>
                    </div>

                    {/* Account identifier form */}
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleContinue();
                      }}
                      className="space-y-5"
                    >
                      <div>
                        <label className="block text-xs font-bold text-[#0B132B] uppercase tracking-wider mb-1.5">
                          Registered mobile number
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-gray-500 font-bold text-sm border-r border-gray-200 pr-2">
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            autoFocus
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter 10-digit number"
                            className="w-full pl-20 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#0B132B] focus:outline-none text-base font-bold text-[#0B132B] placeholder-gray-400 bg-gray-50/50 transition-all tracking-wider"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={!phone.trim() || isLoading}
                        className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-950/20 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #0B132B 0%, #1A2752 60%, #C99A2E 100%)" }}
                      >
                        {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending OTP...</span></> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                      <p className="text-center text-xs text-gray-500">Use the mobile number registered with ARKE. New student accounts complete registration after OTP verification.</p>
                    </form>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    STEP 2: ENTER OTP
                   ═══════════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setStep(1)}
                          className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#0B132B] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit account
                        </button>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B132B]">
                          {phone}
                        </span>
                      </div>
                      <h4 className="text-2xl font-black text-[#0B132B] tracking-tight">Enter mobile OTP</h4>
                      <p className="text-gray-500 text-xs mt-1">
                        Enter the 6-digit code sent to your registered mobile number.
                      </p>
                    </div>

                    <form noValidate onSubmit={handleMobileOtpLogin} className="space-y-6">
                      <div>
                        <label htmlFor="mobile-login-otp" className="block text-xs font-bold text-[#0B132B] uppercase tracking-wider mb-1.5">6-digit OTP</label>
                        <input id="mobile-login-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="Enter 6-digit OTP" className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#0B132B] focus:outline-none text-base font-bold text-[#0B132B] placeholder-gray-400 bg-gray-50/50 transition-all tracking-[0.35em]" />
                        <button type="button" disabled={isLoading} onClick={() => void requestMobileOtp(phone)} className="mt-2 text-xs font-bold text-[#0B132B] hover:text-[#9A6E1C] disabled:opacity-50">Resend OTP</button>
                      </div>

                      {/* Verify Button */}
                      <button
                        type="submit"
                        disabled={!/^\d{6}$/.test(otp) || isLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #0B132B 0%, #1A2752 60%, #C99A2E 100%)" }}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign in</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    STEP 3: PROVIDE DETAILS (Full Name + Gmail + Exam Preferences)
                   ═══════════════════════════════════════════════════════════════ */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Header */}
                    <div className="mb-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C99A2E]/15 border border-[#C99A2E]/30 text-[#9A6E1C] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C99A2E]" />
                        Profile Setup
                      </div>
                      <h4 className="text-2xl font-black text-[#0B132B] tracking-tight">Provide Details</h4>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Complete your name, email, and learning goals to customize your courses and study plan.
                      </p>
                    </div>

                    <form onSubmit={handleSavePreferences} className="space-y-4">
                      
                      {/* Name & Email Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Full Name Input */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              required
                              autoFocus
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="e.g. Aryan Sharma"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#0B132B] focus:outline-none text-xs sm:text-sm font-bold text-[#0B132B] placeholder-gray-400 bg-gray-50/50 transition-all"
                            />
                          </div>
                        </div>

                        {/* Email Address Input (Gmail) */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-1">
                            Email (Gmail) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="e.g. aryan@gmail.com"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#0B132B] focus:outline-none text-xs sm:text-sm font-bold text-[#0B132B] placeholder-gray-400 bg-gray-50/50 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 1. Target Exam / Goal Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#C99A2E]" />
                            1. Select Target Exam
                          </label>
                          <span className="text-[10px] text-gray-400 font-semibold">Required</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {EXAM_GOALS.map((goal) => {
                            const isSelected = selectedGoal === goal.id;
                            const IconComponent = goal.icon;
                            return (
                              <button
                                key={goal.id}
                                type="button"
                                onClick={() => setSelectedGoal(goal.id)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                                  isSelected
                                    ? "border-[#0B132B] bg-[#0B132B]/5 shadow-sm ring-1 ring-[#C99A2E]/40"
                                    : "border-gray-200 bg-white hover:border-[#0B132B]/30 text-gray-700"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-[#0B132B] text-[#C99A2E]"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className={`font-black text-xs truncate ${isSelected ? "text-[#0B132B]" : "text-gray-800"}`}>
                                      {goal.title}
                                    </p>
                                    {isSelected && (
                                      <div className="w-4 h-4 rounded-full bg-[#0B132B] text-white flex items-center justify-center flex-shrink-0">
                                        <Check className="w-2.5 h-2.5 stroke-[3] text-[#C99A2E]" />
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-500 truncate">{goal.tagline}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Select Class / Grade */}
                      <div>
                        <label className="text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#C99A2E]" />
                          2. Select Your Class
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {CLASSES.map((cls) => {
                            const isSelected = selectedClass === cls.id;
                            return (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => setSelectedClass(cls.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  isSelected
                                    ? "bg-[#0B132B] text-white border-[#C99A2E] shadow-sm ring-2 ring-[#C99A2E]/20"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                                }`}
                              >
                                {cls.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Preferred Language / Medium */}
                      <div>
                        <label className="text-[11px] font-bold text-[#0B132B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#C99A2E]" />
                          3. Preferred Language
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {MEDIUMS.map((med) => {
                            const isSelected = selectedMedium === med.id;
                            return (
                              <button
                                key={med.id}
                                type="button"
                                onClick={() => setSelectedMedium(med.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  isSelected
                                    ? "bg-[#0B132B] text-[#C99A2E] border-[#C99A2E] shadow-sm ring-2 ring-[#C99A2E]/20"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent"
                                }`}
                              >
                                {isSelected ? `✓ ${med.label}` : med.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Submit CTA */}
                      <button
                        type="submit"
                        disabled={!fullName.trim() || !email.trim() || isLoading}
                        className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 mt-4"
                        style={{ background: "linear-gradient(135deg, #0B132B 0%, #1A2752 50%, #C99A2E 100%)" }}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Completing Setup...</span>
                          </>
                        ) : (
                          <>
                            <span>Complete Profile & Start Learning</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
