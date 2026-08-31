"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import {
  BookOpen, Video, ArrowRight, Shield, Zap, Sparkles,
  BarChart, GraduationCap, CheckCircle2, Star, Trophy, Target,
  FlaskConical, Atom, HeartPulse, Brain, Award, ChevronRight,
  Play, Phone, Mail, MapPin, Menu, X, TrendingUp, FileText, Layers
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { LoginModal } from "@/components/LoginModal";
import { BannerCarousel } from "@/components/BannerCarousel";

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | boolean>(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.2]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    
    // Auth Check
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) {}
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { 
      icon: Video, color: "#e8470a", bg: "#fff3ee", 
      title: "Interactive Live HD Classes", 
      desc: "Real-Time Classroom Interaction: Seamless streaming with integrated live polls, chat, and an interactive whiteboard. Audio \"Raise Hand\" Feature: Enables students to ask verbal doubts directly to faculty during live sessions. Instant Recordings & Markers: Class recordings are published automatically with topic-wise timestamps for rapid revision." 
    },
    { 
      icon: BookOpen, color: "#0033a0", bg: "#eef2ff", 
      title: "Structured Study Material", 
      desc: "Comprehensive Notes & Maps: Chapter-wise theory notes, mind maps, and high-yield diagrams mapped directly to the NEET UG syllabus. Line-by-Line NCERT Coverage: Dedicated page-by-page textbook breakdowns and exemplar solutions for Biology, Chemistry, and Physics. Downloadable & Printable PDFs: Annotation-ready study sheets and formula ebooks accessible across mobile and desktop devices." 
    },
    { 
      icon: FileText, color: "#7b3fa0", bg: "#f5eeff", 
      title: "NTA-Pattern Mock Tests & DPPs", 
      desc: "Exact NTA Exam Replica: Practice tests featuring the official NTA user interface, question palette, and +4/-1 marking scheme. Graded DPPs: Daily topic-level question sets complete with step-by-step video and text solutions. Previous Year Question Bank: Decades of fully solved PYQs filterable by chapter, topic, and difficulty level." 
    },
    { 
      icon: BarChart, color: "#0369a1", bg: "#e0f2fe", 
      title: "AI-Powered Performance Analytics", 
      desc: "Rank & Score Predictor: Automatic mapping of weak topics in exam and option of creating level wise DPP for revision and self-analysis. Machine-learning insights that estimate All-India Rank (AIR) and target medical college cutoffs based on test history. Subject & Topic Heatmaps: Visual representations of strong, moderate, and weak chapters to streamline study schedules." 
    },
    { 
      icon: Shield, color: "#059669", bg: "#ecfdf5", 
      title: "CBT NEET Yoddha Test Series", 
      desc: "Real-Exam Computer-Based Tests (CBT): Practice on authentic NTA-pattern exam interfaces featuring minor, major chapter-wise tests, and full-syllabus grand mock exams. Video Solutions & Rank Prediction: Access step-by-step video solutions for every question alongside instant performance analytics and All India Rank (AIR) predictions. Flexible Learning & Offline Mocks: Complete tests online or take advantage of a free offline Grand Test conducted after syllabus completion." 
    },
    { 
      icon: Brain, color: "#d97706", bg: "#fffbeb", 
      title: "24/7 Doubt Resolution & Mentorship", 
      desc: "Snap & Solve Doubt Engine: Allows students to upload photo queries and receive instant step-by-step video solutions. Teachers-Moderated Community: Active discussion board where teachers address concept queries around the clock. Parent & Progress Reports: Automated weekly performance summaries sent to parents via the portal." 
    },
  ];

  const subjects = [
    { icon: Atom,      name: "Physics",   color: "#0033a0", lightBg: "#eef2ff",  topics: "Mechanics · Optics · Modern Physics · Thermodynamics", chapters: 27 },
    { icon: FlaskConical, name: "Chemistry", color: "#e8470a", lightBg: "#fff3ee", topics: "Organic · Inorganic · Physical Chemistry",              chapters: 19 },
    { icon: HeartPulse, name: "Biology",  color: "#059669", lightBg: "#ecfdf5",  topics: "Botany · Zoology · Human Physiology · Genetics",        chapters: 32 },
  ];

  const testimonials = [
    { name: "Dr. Abdul Mukeem",  color: "#0033a0", subtitle: "(KGMU LUCKNOW) - 2024", quote: "I am deeply grateful to SKD Coaching for their unwavering support and excellent guidance that helped me succeed in NEET..." },
    { name: "Dr. Khusdil Alam",   color: "#e8470a", subtitle: "(AIIMS BUBHENESHWAR) - 2024", quote: "As an alumnus/alumna, I attribute a significant part of my personal and professional growth to the coaching I..." },
    { name: "Dr. Saumya Chaubey", color: "#7b3fa0", subtitle: "MBBS 1st Year, Dr. Ram Manohar Lohia Institute of Medical Sciences, Lucknow", quote: "SKD New Standard Coaching Institute provided me with a very conducive learning environment. The teachers are..." },
    { name: "Dr. Shruti Shukla",  color: "#059669", subtitle: "MBBS 1st Year, Ganesh Shankar Vidyarthi Memorial Medical College, Kanpur", quote: "SKD New Standard Coaching Institute provides excellent study material, and the practice tests are very useful. It helped ..." },
    { name: "Dr. Ayush Dixit",    color: "#0033a0", subtitle: "MBBS 1st Year, Lala Lajpat Rai Medical College, Meerut", quote: "Thanks to SKD coaching, I was able to score very well in NEET and get admission to my dream medical college. I am very..." },
    { name: "Dr. Iqra Khan",      color: "#e8470a", subtitle: "(VMMC Delhi) - 2024", quote: "SKD NSCI helped me build strong concepts and improve my NEET score significantly." },
  ];

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const limit = isMobile ? testimonials.length - 1 : testimonials.length - 2;
      setActiveTestimonialIndex((prev) => (prev >= limit ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length, isMobile]);

  useEffect(() => {
    fetch('/api/v1/public/courses')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const sequence = [
            "PRIME",
            "YODHA",
            "NEO"
          ];
          const seenIds = new Set<string>();
          const seenNames = new Set<string>();
          const uniqueCourses: any[] = [];

          for (const c of (data.data || [])) {
            const cId = c._id?.toString() || c.id?.toString();
            const cName = (c.name || '').toString().trim().toLowerCase();

            if ((cId && seenIds.has(cId)) || (cName && seenNames.has(cName))) {
              continue;
            }

            if (cId) seenIds.add(cId);
            if (cName) seenNames.add(cName);
            uniqueCourses.push(c);
          }

          const sorted = uniqueCourses.sort((a: any, b: any) => {
            const indexA = sequence.findIndex(s => a.name?.toUpperCase().includes(s));
            const indexB = sequence.findIndex(s => b.name?.toUpperCase().includes(s));
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
          });
          const mapped = sorted.map((c: any) => ({
            ...c,
            price: c.fee ? c.fee.toLocaleString() : 'N/A',
            actualPrice: c.actualFee ? c.actualFee.toLocaleString() : null
          }));
          setPlans(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPlans(false));
  }, []);

  const tabs = [
    { label: "Live Classes",  icon: Video,      title: "Attend Live from Anywhere",     desc: "Join real-time classes with top NEET experts. Ask questions via live chat, attend whiteboard sessions, and get instant doubt resolution. Can't attend live? Access recordings anytime." },
    { label: "Mock Tests",    icon: FileText,   title: "NTA-Pattern Simulation",        desc: "180 questions, 200 minutes — exactly as in NEET. Our tests use actual NTA marking scheme with AI-generated explanations for every answer. Track your all-India rank." },
    { label: "DPP Practice",  icon: Target,     title: "Daily Practice Problems",       desc: "Topicwise DPPs updated every day by our expert faculty. Each problem comes with video solution and detailed explanation to build concept clarity." },
    { label: "Analytics",     icon: TrendingUp, title: "Know Your Rank in Real Time",   desc: "See exactly where you stand with chapter-wise accuracy, time management analysis, and predicted NEET score. Get personalised study plan based on your performance." },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LoginModal isOpen={isLoginModalOpen} redirectOnSuccess={redirectUrl} onClose={() => {
        setIsLoginModalOpen(false);
        setRedirectUrl(false);
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
      }} />

      {/* ── BACKGROUND — clean, no blobs ───────────────────────────────────── */}

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ${
          scrolled
            ? "bg-white shadow-md border-b border-gray-200 py-3"
            : "bg-white/80 backdrop-blur-md py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/SKD-logo.png" alt="SKD Xpress" width={160} height={60} className="h-11 w-auto object-contain" priority />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {[["Features", "#features"], ["Subjects", "#subjects"], ["Results", "#results"], ["Pricing", "#pricing"], ["Contact", "#contact"]].map(([label, href]) => (
              <a key={label} href={href}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors duration-200 relative group">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] rounded-full group-hover:w-full transition-all duration-300" style={{ background: "#e8470a" }} />
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <button onClick={() => router.push(`/${user.role}/dashboard`)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)" }}>
                Go to Portal <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => { setRedirectUrl(true); setIsLoginModalOpen(true); }} className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100">
                  Login / Register
                </button>
                <button onClick={() => { setRedirectUrl(true); setIsLoginModalOpen(true); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #e8470a, #f76c2f)", boxShadow: "0 4px 14px rgba(232,71,10,0.35)" }}>
                  Start Free <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-white border-t border-gray-100 shadow-lg"
            >
              <div className="px-6 py-6 flex flex-col gap-4">
                {[["Features", "#features"], ["Subjects", "#subjects"], ["Results", "#results"], ["Pricing", "#pricing"]].map(([label, href]) => (
                  <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-gray-900 font-semibold text-lg transition-colors py-1 border-b border-gray-50">{label}</a>
                ))}
                {user ? (
                  <button onClick={() => router.push(`/${user.role}/dashboard`)}
                    className="mt-2 text-center py-3 rounded-xl font-bold text-white w-full flex justify-center"
                    style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)" }}>
                    Go to Portal →
                  </button>
                ) : (
                  <button onClick={() => { setMobileMenuOpen(false); setIsLoginModalOpen(true); }}
                    className="mt-2 text-center py-3 rounded-xl font-bold text-white w-full flex justify-center"
                    style={{ background: "linear-gradient(135deg, #e8470a, #f76c2f)" }}>
                    Start Learning Free →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-20"
        style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fff8f5 40%, #faf5ff 100%)" }}
      >
        {/* Top Badge */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-bold"
          style={{ background: "#fef3c7", border: "2px solid #f59e0b", color: "#78350f" }}>
          <Trophy className="w-4 h-4" style={{ color: "#f5b800" }} />
          #1 NEET Preparation Platform in Lucknow
          <Sparkles className="w-4 h-4" style={{ color: "#f5b800" }} />
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.7 }} className="max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-[80px] font-black tracking-tight leading-[1.08] mb-6 text-gray-900">
            Crack NEET with
            <br />
            <span style={{ background: "linear-gradient(135deg, #0033a0 0%, #e8470a 60%, #7b3fa0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              SKD Xpress
            </span>
            <br />
            <span className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-600">
              Online Learning Platform
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }}
          className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Join <strong className="text-gray-900">5,000+ NEET aspirants</strong> who trust SKD Xpress for live classes, mock tests, DPPs, and AI-powered analytics.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          {user ? (
            <button onClick={() => router.push(`/${user.role}/dashboard`)}
              className="group w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white text-lg flex items-center gap-3 justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)", boxShadow: "0 8px 28px rgba(0,51,160,0.4)" }}>
              Go to Your Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button onClick={() => setIsLoginModalOpen(true)}
              className="group w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white text-lg flex items-center gap-3 justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #e8470a, #f76c2f)", boxShadow: "0 8px 28px rgba(232,71,10,0.4)" }}>
              <GraduationCap className="w-5 h-5" />
              Start Free Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <button onClick={() => setIsLoginModalOpen(true)}
            className="group w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-gray-700 text-lg border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-3 justify-center transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
            <Play className="w-5 h-5" style={{ color: "#0033a0" }} />
            Watch Demo
          </button>
        </motion.div>

        {/* Promotional Banners Carousel */}
        <div className="w-full max-w-4xl mx-auto mt-10">
          <BannerCarousel />
        </div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-gray-600 font-semibold">
          {["NTA Pattern Tests", "Expert Faculty", "Live Classes Daily", "7-Day Free Trial"].map((text) => (
            <span key={text} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: "#059669" }} /> {text}
            </span>
          ))}
        </motion.div>

        {/* ── HERO DASHBOARD PREVIEW ── */}
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.85, duration: 0.8 }}
          className="relative mt-14 w-full max-w-5xl mx-auto">

          {/* Main card */}
          <div className="rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            style={{ background: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div className="p-6 sm:p-8">
              {/* Dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-0.5">Good Morning, Rahul 👋</p>
                  <h3 className="text-gray-900 font-bold text-lg">Your NEET Dashboard</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Class Active
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Mock Score",  value: "680/720", change: "+12",      color: "#0033a0", bg: "#eef2ff" },
                  { label: "Percentile", value: "99.2%",   change: "+0.8%",    color: "#e8470a", bg: "#fff3ee" },
                  { label: "Rank",       value: "#245",    change: "↑ 34",     color: "#7b3fa0", bg: "#f5eeff" },
                  { label: "DPPs Done",  value: "142/180", change: "+6 today", color: "#059669", bg: "#ecfdf5" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-sm" style={{ background: stat.bg }}>
                    <p className="text-gray-500 text-xs mb-1 font-semibold">{stat.label}</p>
                    <p className="text-gray-900 font-black text-lg sm:text-xl">{stat.value}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: stat.color }}>{stat.change}</p>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { subject: "Physics",   percent: 78, color: "#0033a0" },
                  { subject: "Chemistry", percent: 85, color: "#e8470a" },
                  { subject: "Biology",   percent: 91, color: "#059669" },
                ].map((sub) => (
                  <div key={sub.subject} className="rounded-xl p-3 bg-white border border-gray-100 shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 text-xs font-bold">{sub.subject}</span>
                      <span className="text-gray-900 text-xs font-black">{sub.percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${sub.percent}%` }}
                        transition={{ delay: 1.1, duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ background: sub.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badge — top right */}
          <motion.div
            animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -right-4 sm:-right-6 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
            style={{ background: "linear-gradient(135deg, #f5b800, #e8470a)", boxShadow: "0 8px 28px rgba(245,184,0,0.35)" }}>
            <Trophy className="w-5 h-5 text-white" />
            <div>
              <p className="text-white/80 text-xs">Top Performer</p>
              <p className="text-white font-black text-sm">AIR #12 🎉</p>
            </div>
          </motion.div>

          {/* Floating badge — bottom left */}
          <motion.div
            animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-4 -left-4 sm:-left-6 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
            style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)", boxShadow: "0 8px 28px rgba(0,51,160,0.3)" }}>
            <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
            <div>
              <p className="text-white/70 text-xs">RIGHT NOW</p>
              <p className="text-white font-black text-sm">1,240 Students Live</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-gray-300 text-xs font-medium">Scroll to explore</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-9 rounded-full border-2 border-gray-200 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-gray-300" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 border-y border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 5000, suffix: "+",     label: "Active Students",        color: "#0033a0" },
              { value: 690,   suffix: "/720",  label: "Highest Score Achieved", color: "#e8470a" },
              { value: 75,    suffix: "%",     label: "NEET Qualification Rate", color: "#7b3fa0" },
              { value: 50,    suffix: "+",     label: "NEET AIR under 1000",      color: "#d97706" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-5xl sm:text-6xl font-black mb-2 tabular-nums" style={{ color: stat.color }}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 uppercase tracking-widest"
              style={{ background: "#eef2ff", color: "#0033a0", border: "1.5px solid #c7d2fe" }}>
              <Layers className="w-3.5 h-3.5" /> Platform Features
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              Everything You Need to{" "}
              <span style={{ background: "linear-gradient(90deg, #e8470a, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Score 700+
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Scientifically designed curriculum, expert faculty, and cutting-edge technology — all in one platform.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -6, scale: 1.02, backgroundColor: feat.bg }}
                onClick={() => setIsLoginModalOpen(true)}
                className="group relative rounded-2xl p-6 border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-white border-gray-100">
                {/* Hover accent line */}
                <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: feat.color }} />
                <div className="w-13 h-13 rounded-2xl w-12 h-12 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: feat.bg }}>
                  <feat.icon className="w-6 h-6" style={{ color: feat.color }} />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{feat.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{feat.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-xs font-bold transition-opacity opacity-0 group-hover:opacity-100" style={{ color: feat.color }}>
                  Learn more <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSES ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 py-24 px-4 sm:px-6" style={{ background: "linear-gradient(180deg, #f8faff 0%, #fff 100%)" }}>
        <div className="max-w-7xl mx-auto">

          {/* Section Header */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 uppercase tracking-widest"
              style={{ background: "#fffbeb", color: "#92400e", border: "1.5px solid #fcd34d" }}>
              <GraduationCap className="w-3.5 h-3.5" /> Choose Your Learning Plan
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              India&apos;s Complete NEET<br />
              <span style={{ color: "#0033a0" }}>Preparation Program</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">SKD Xpress — Learn from Home. Crack NEET with Confidence.</p>
          </motion.div>

          {/* Quick Comparison Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl overflow-hidden mb-10 shadow-lg"
            style={{ background: "linear-gradient(135deg, #0a1f5c 0%, #0033a0 100%)" }}>
            <div className="px-6 py-4 text-center">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">🚀 Choose Your Learning Plan</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {plans.slice(0, 3).map((plan, i) => {
                const taglines = [
                  "Students who want complete preparation",
                  "Students already attending coaching/school",
                  "Students looking for interactive online classes"
                ];
                const badges = ["BEST VALUE", "", ""];
                return (
                  <div key={plan._id} 
                    onClick={() => {
                      if (!user) {
                        setRedirectUrl(`/student/course/${plan._id}`);
                        setIsLoginModalOpen(true);
                      } else {
                        router.push(`/course/${plan._id}`);
                      }
                    }}
                    className="flex flex-col items-center p-4 sm:p-6 text-center cursor-pointer hover:bg-white/5 transition-all duration-200"
                  >
                    {badges[i] && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white mb-2 inline-block" style={{ background: "#e8470a" }}>
                        {badges[i]}
                      </span>
                    )}
                    <p className="text-white font-black text-xs sm:text-sm leading-tight mb-2">{plan.name}</p>
                    <p className="text-white/60 text-xs mb-3 hidden sm:block">{taglines[i] || plan.subtitle}</p>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: i === 0 ? "#ffd700" : i === 1 ? "#4ade80" : "#c4b5fd" }}>₹{plan.price}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Course Cards */}
          {loadingPlans ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-stretch">
              {plans.map((plan, i) => {
              const courseNums = ["01", "02", "03"];
              const courseIcons = [
                <Trophy key="t" className="w-5 h-5 text-white" />,
                <Target key="tg" className="w-5 h-5 text-white" />,
                <Video key="v" className="w-5 h-5 text-white" />,
              ];
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -8, boxShadow: `0 24px 48px ${plan.color}25` }}
                  className="flex flex-col rounded-2xl overflow-hidden border-2 bg-white transition-all duration-300"
                  style={{ borderColor: plan.popular ? plan.color : "#e5e7eb", boxShadow: plan.popular ? `0 12px 40px ${plan.color}20` : undefined }}>

                  {/* Card Header */}
                  <div className="px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}cc 100%)` }}>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                        {courseIcons[i]}
                      </div>
                      <span className="text-white/60 text-xs font-black uppercase tracking-widest">Course {courseNums[i]}</span>
                      {plan.tag && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>
                          {plan.tag}
                        </span>
                      )}
                      {plan.badge && (
                        <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-xl leading-tight mb-1">{plan.name}</h3>
                    <p className="text-white/75 text-sm">{plan.subtitle}</p>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col p-6">
                    {/* What's Included */}
                    <div className="mb-5">
                      <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: plan.color }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> What&apos;s Included
                      </p>
                      <ul className="space-y-2">
                        {plan.features?.map((f: string, fi: number) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-1 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center" style={{ background: `${plan.color}18` }}>
                              <CheckCircle2 className="w-3 h-3" style={{ color: plan.color }} />
                            </span>
                            <span className="text-gray-700 leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Best For */}
                    <div className="mb-6">
                      <p className="text-xs font-black uppercase tracking-widest mb-2.5 text-gray-500">Best For</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.bestFor?.map((b: string, bi: number) => (
                          <span key={bi}
                            className="text-xs px-3 py-1 rounded-full font-semibold"
                            style={{ background: `${plan.color}12`, color: plan.color, border: `1px solid ${plan.color}25` }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Enroll Button */}
                    <div className="mt-auto">
                      <button onClick={() => {
                        if (!user) {
                          setRedirectUrl(`/student/course/${plan._id}`);
                          setIsLoginModalOpen(true);
                        } else {
                          router.push(`/course/${plan._id}`);
                        }
                      }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)`, color: "white", boxShadow: `0 6px 20px ${plan.color}35` }}>
                        View Details & Enroll <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Course Fee Footer */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ background: `${plan.color}08`, borderTop: `2px solid ${plan.color}20` }}>
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: plan.color }}>Course Fee</span>
                    <div className="flex items-center gap-2">
                      {plan.actualPrice && (
                        <span className="text-sm font-bold line-through opacity-60" style={{ color: plan.color }}>₹{plan.actualPrice}</span>
                      )}
                      <span className="text-2xl font-black" style={{ color: plan.color }}>₹{plan.price}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}

          {/* ── Course Schedule + Feature Comparison ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Course Schedule */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0a1f5c, #0033a0)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Course Schedule</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#eef2ff" }}>
                    <svg className="w-6 h-6" style={{ color: "#0033a0" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Class Timing</p>
                    <p className="text-gray-900 font-black text-lg">10:00 AM – 2:00 PM</p>
                  </div>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff3ee" }}>
                    <svg className="w-6 h-6" style={{ color: "#e8470a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Days</p>
                    <p className="text-gray-900 font-black text-lg">Monday – Saturday</p>
                  </div>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#ecfdf5" }}>
                    <Target className="w-6 h-6" style={{ color: "#059669" }} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Tentative Syllabus Completion</p>
                    <p className="font-black text-xl" style={{ color: "#e8470a" }}>20 February 2027</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Comparison Table */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0a1f5c, #0033a0)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
                  <BarChart className="w-4 h-4 text-white" />
                </div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Feature Comparison</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-50 w-2/5">Features</th>
                      <th className="text-center px-3 py-3 text-xs font-black text-white w-1/5" style={{ background: "#0033a0" }}>{plans[0]?.name || "PRIME"}</th>
                      <th className="text-center px-3 py-3 text-xs font-black text-white w-1/5" style={{ background: "#e8470a" }}>{plans[1]?.name || "YODHA"}</th>
                      <th className="text-center px-3 py-3 text-xs font-black text-white w-1/5" style={{ background: "#7b3fa0" }}>{plans[2]?.name || "NEO"}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {[
                      { feature: "LIVE Interactive Classes",     live: true,  cbt: false, liveOnly: true  },
                      { feature: "Class Notes PDF",              live: true,  cbt: false, liveOnly: true  },
                      { feature: "NEET PYQ Practice Sheets",    live: true,  cbt: false, liveOnly: true  },
                      { feature: "Subject-wise DPPs",           live: true,  cbt: false, liveOnly: true  },
                      { feature: "CBT NEET Yoddha Test Series", live: true,  cbt: true,  liveOnly: false },
                      { feature: "Chapter-wise Tests",          live: true,  cbt: true,  liveOnly: false },
                      { feature: "Full Syllabus Tests",         live: true,  cbt: true,  liveOnly: false },
                      { feature: "Video Solutions",             live: true,  cbt: true,  liveOnly: false },
                      { feature: "24×7 Doubt Support",          live: true,  cbt: false, liveOnly: true  },
                      { feature: "NCERT PDF",                   live: true,  cbt: false, liveOnly: true  },
                      { feature: "Free Offline Grand Test",     live: true,  cbt: false, liveOnly: false },
                      { feature: "Performance Analysis",        live: true,  cbt: true,  liveOnly: false },
                      { feature: "Rank Prediction",             live: true,  cbt: true,  liveOnly: false },
                    ].map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                        <td className="px-4 py-2.5 text-gray-700 font-medium text-xs">{row.feature}</td>
                        <td className="px-3 py-2.5 text-center">
                          {row.live
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50"><X className="w-3.5 h-3.5 text-red-400" /></span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.cbt
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50"><X className="w-3.5 h-3.5 text-red-400" /></span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.liveOnly
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50"><X className="w-3.5 h-3.5 text-red-400" /></span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── SUBJECTS ───────────────────────────────────────────────────────── */}
      <section id="subjects" className="relative z-10 py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 uppercase tracking-widest"
              style={{ background: "#fff3ee", color: "#e8470a", border: "1.5px solid #fecdb4" }}>
              <BookOpen className="w-3.5 h-3.5" /> NEET Subjects
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">Master All 3 Subjects<br />with Expert Faculty</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Complete NEET syllabus with 180+ hours of video content per subject.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((sub, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15 }}
                whileHover={{ y: -8 }}
                className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                {/* Top accent bar */}
                <div className="h-1.5 w-full" style={{ background: sub.color }} />
                <div className="p-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: sub.lightBg }}>
                    <sub.icon className="w-8 h-8" style={{ color: sub.color }} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{sub.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{sub.topics}</p>
                  <div className="flex items-center justify-between py-5 border-t border-gray-100">
                    <div>
                      <p className="text-3xl font-black" style={{ color: sub.color }}>{sub.chapters}</p>
                      <p className="text-gray-500 text-xs font-semibold">Chapters Covered</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-bold text-sm">200+ Hours</p>
                      <p className="text-gray-500 text-xs font-semibold">Video Content</p>
                    </div>
                  </div>
                  <button onClick={() => setIsLoginModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                    style={{ background: sub.lightBg, color: sub.color }}>
                    Start {sub.name} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS / TABS ────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">How SKD Xpress Works</h2>
            <p className="text-gray-600 text-lg">A complete study ecosystem built for NEET success</p>
          </motion.div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
                style={activeTab === i
                  ? { background: "linear-gradient(135deg, #e8470a, #f76c2f)", color: "white", boxShadow: "0 4px 16px rgba(232,71,10,0.35)" }
                  : { background: "#f3f4f6", color: "#6b7280" }}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}
              className="rounded-2xl p-8 sm:p-12 text-center bg-white border border-gray-200 shadow-md">
              {(() => {
                const ActiveIcon = tabs[activeTab].icon;
                return (
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                    style={{ background: "#fff3ee" }}>
                    <ActiveIcon className="w-8 h-8" style={{ color: "#e8470a" }} />
                  </div>
                );
              })()}
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">{tabs[activeTab].title}</h3>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">{tabs[activeTab].desc}</p>
              <button onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 rounded-2xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)", boxShadow: "0 4px 20px rgba(0,51,160,0.3)" }}>
                Try it Free <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section id="results" className="relative z-10 py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 uppercase tracking-widest"
              style={{ background: "#f5eeff", color: "#7b3fa0", border: "1.5px solid #d8b4fe" }}>
              <Award className="w-3.5 h-3.5" /> Topper Stories
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              Our Students{" "}
              <span style={{ background: "linear-gradient(90deg, #7b3fa0, #e8470a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Top Every Year
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Real results from real students. Our track record speaks for itself.</p>
          </motion.div>

          <div className="overflow-hidden relative w-full px-1">
            <div 
              className="flex transition-transform duration-700 ease-in-out -mx-3"
              style={{ transform: `translateX(-${activeTestimonialIndex * (isMobile ? 100 : 50)}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={i} className="w-full md:w-1/2 px-3 flex-shrink-0">
                  <div className="rounded-2xl p-6 sm:p-8 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between">
                    <div>
                      {/* Stars */}
                      <div className="flex gap-0.5 mb-4">
                        {[...Array(5)].map((_, si) => <Star key={si} className="w-4 h-4" fill="#f5b800" color="#f5b800" />)}
                      </div>
                      <p className="text-gray-700 leading-relaxed text-sm italic mb-6">&ldquo;{t.quote}&rdquo;</p>
                    </div>
                    <div>
                      <h4 className="text-gray-900 font-bold text-lg">{t.name}</h4>
                      <p className="text-xs text-gray-500 font-semibold mt-1">{t.subtitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results banner */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-10 rounded-2xl p-6 sm:p-10 text-center border"
            style={{ background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)", borderColor: "#93c5fd" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { num: "12",     label: "AIR Under 100" },
                { num: "87",     label: "AIR Under 1000" },
                { num: "320+",   label: "Qualified MBBS" },
                { num: "720/720",label: "Perfect Scorers" },
              ].map((r, i) => (
                <div key={i}>
                  <p className="text-3xl sm:text-4xl font-black mb-1" style={{ color: i % 2 === 0 ? "#0033a0" : "#e8470a" }}>{r.num}</p>
                  <p className="text-gray-700 text-xs font-semibold">NEET 2024 — {r.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center text-white"
            style={{ background: "linear-gradient(135deg, #0033a0 0%, #7b3fa0 50%, #e8470a 100%)", boxShadow: "0 24px 64px rgba(0,51,160,0.3)" }}>
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative z-10">
              <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <Trophy className="w-14 h-14 text-yellow-300 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-3xl sm:text-5xl font-black mb-5">Your NEET Success<br />Starts Today.</h2>
              <p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
                Join 5,000+ students already on their path to becoming doctors.<br />Start your 7-day free trial — no credit card needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setIsLoginModalOpen(true)}
                  className="group px-10 py-4 rounded-2xl font-black text-lg text-[#0033a0] bg-white hover:bg-gray-50 transition-all hover:scale-105 flex items-center justify-center gap-2"
                  style={{ boxShadow: "0 6px 28px rgba(255,255,255,0.25)" }}>
                  Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setIsLoginModalOpen(true)}
                  className="px-10 py-4 rounded-2xl font-bold text-lg text-white border-2 border-white/30 hover:border-white/60 transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5" /> Talk to Counselor
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT ────────────────────────────────────────────────────────── */}
      <section id="contact" className="relative z-10 py-16 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { icon: Phone,  label: "Call Us",   value: "+91 7080111578",      sub: "Mon–Sat, 9AM–7PM",     color: "#0033a0" },
              { icon: Mail,   label: "Email Us",  value: "info@skdnsci.com",   sub: "We reply within 24hrs", color: "#e8470a" },
              { icon: MapPin, label: "Visit Us",  value: "11, Sapru Marg, Lucknow",          sub: "Coaching + Online",     color: "#7b3fa0" },
            ].map((c, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${c.color}12` }}>
                  <c.icon className="w-6 h-6" style={{ color: c.color }} />
                </div>
                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">{c.label}</p>
                <p className="text-gray-900 font-bold">{c.value}</p>
                <p className="text-gray-500 text-xs">{c.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 pt-16 pb-8 px-4 sm:px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <Image src="/SKD-logo.png" alt="SKD Xpress" width={180} height={70} className="h-14 w-auto object-contain mb-5" />
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                India&apos;s most trusted NEET preparation platform. Expert faculty, cutting-edge technology, and proven results — all for your success.
              </p>
              <div className="flex items-center gap-5 mt-6">
                {["📘 Facebook", "📸 Instagram", "▶️ YouTube"].map((s) => (
                  <a key={s} href="#" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">{s}</a>
                ))}
              </div>
            </div>
            {[
              { title: "Platform", links: [
                { name: "Live Classes", href: "#" },
                { name: "Mock Tests", href: "#" },
                { name: "DPP Practice", href: "#" },
                { name: "Analytics", href: "#" },
                { name: "Study Material", href: "#" }
              ]},
              { title: "Subjects", links: [
                { name: "Physics", href: "#" },
                { name: "Chemistry", href: "#" },
                { name: "Biology", href: "#" },
                { name: "Previous Papers", href: "#" },
                { name: "Short Notes", href: "#" }
              ]},
              { title: "Company", links: [
                { name: "About SKD", href: "#" },
                { name: "Our Faculty", href: "#" },
                { name: "Results 2024", href: "#" },
                { name: "Privacy Policy", href: "/privacy-policy" },
                { name: "Terms & Conditions", href: "/terms-conditions" },
                { name: "Refund Policy", href: "/refund-cancellation" }
              ]},
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-gray-800 font-bold text-xs mb-5 uppercase tracking-widest">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-gray-500 text-sm hover:text-gray-900 transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
            <p className="text-gray-500 text-sm">© 2026 SKD Xpress. All rights reserved. | Online Learning Platform for NEET</p>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              Made with <span className="text-red-400">❤️</span> for NEET Aspirants
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
