"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Video, ArrowRight, Shield, Sparkles,
  BarChart, GraduationCap, CheckCircle2, Star, Trophy, Target,
  FlaskConical, Atom, HeartPulse, Brain, Award, ChevronRight,
  ChevronDown, Play, Phone, Mail, MapPin, Menu, X, TrendingUp, FileText, Layers, Users, HelpCircle, Check, Smartphone
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { LoginModal } from "@/components/LoginModal";
import { BannerCarousel } from "@/components/BannerCarousel";

// ─── Mentor Data ─────────────────────────────────────────────────────────────
const MENTORS = [
  { name: "Pawan Goyal", role: "Physics Educator", exp: "Ex-IITian & Senior Faculty", image: "/arke/pawan-goyal.jpeg" },
  { name: "Kartikey Mittal", role: "Chemistry Educator", exp: "IIT Bombay Alumnus", image: "/arke/kartikey mittal.jpeg" },
  { name: "Mayank Motwani", role: "Math Educator", exp: "IIT Delhi Alumnus", image: "/arke/mayank motwani.jpeg" },
  { name: "Abhishek Kumar Singh", role: "Biology Educator", exp: "Senior NEET Specialist", image: "/arke/abhishek kumar singh.jpeg" },
  { name: "Vishwajeet Agarwal", role: "Physics Specialist", exp: "10+ Yrs JEE Rank Producer", image: "/arke/vishwajet agarwal.jpeg" },
  { name: "Aayush", role: "Chemistry Specialist", exp: "Ex-Allen & FIITJEE Faculty", image: "/arke/Aayush.png" },
  { name: "Aryan Gupta", role: "Math Specialist", exp: "IIT Roorkee Alumnus", image: "/arke/aryan gupta.jpeg" },
  { name: "Rushi Patel", role: "Physics Specialist", exp: "JEE Advanced Expert", image: "/arke/rushi patel.jpeg" },
  { name: "Sankalp", role: "Biology Specialist", exp: "Top NEET Rank Mentor", image: "/arke/sankalp.jpeg" },
  { name: "Aankan Sarkar", role: "Chemistry Specialist", exp: "Olympiad & JEE Faculty", image: "/arke/aankan sarkar.jpeg" },
  { name: "Samarth Agarwal", role: "Mathematics Specialist", exp: "Senior JEE Educator", image: "/arke/samarth agarwal.jpeg" },
  { name: "Utkarsh Daga", role: "Physics Specialist", exp: "IIT Kharagpur Alumnus", image: "/arke/utkarsh daga .jpeg" },
  { name: "Yash Jain", role: "Chemistry Specialist", exp: "Physical Chemistry Expert", image: "/arke/yash jain.jpeg" },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: "What courses does ARKE Scholars offer?",
    answer: "ARKE Scholars provides specialized online coaching for JEE Main, JEE Advanced, NEET UG, and Foundation courses (Classes 8th to 10th). Our programs include live interactive classes, comprehensive study notes, daily practice problems (DPPs), and computer-based mock test series."
  },
  {
    question: "Who will be teaching the live classes?",
    answer: "Classes are conducted by top educators including IITians, IIMians, and experienced NEET specialists who have produced All India Rankers in JEE and NEET over the past decade."
  },
  {
    question: "Are mock tests based on the latest NTA pattern?",
    answer: "Yes, 100%. All mock tests replicate the exact NTA exam interface, timing, question palette, and marking schemes (+4 / -1) for both JEE and NEET."
  },
  {
    question: "How does 24/7 AI & Mentor doubt resolution work?",
    answer: "Students can take a photo of any question or concept query and upload it via the ARKE app or portal to receive instant step-by-step video and text solutions, complemented by live teacher assistance."
  },
  {
    question: "Can I access recorded classes if I miss a live session?",
    answer: "Yes! Every live class is recorded automatically and posted to your dashboard with topic-wise video markers for convenient, high-speed revision anytime."
  }
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);

    // Auth Check
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) {}
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDashboardRedirect = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const role = user.role || "student";
    if (role === "admin" || role === "super_admin") router.push("/admin/dashboard");
    else if (role === "teacher" || role === "skd-teacher" || role === "arke-teacher") router.push("/teacher/dashboard");
    else router.push("/student/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* ─── Header / Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-navy text-white border-b border-white/10 shadow-lg py-3 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-2 group py-1">
            <Image
              src="/arke_logo_light.png"
              alt="ARKE Scholars Logo"
              width={200}
              height={56}
              className="h-9 sm:h-11 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              priority
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90">
            <a href="#courses" className="hover:text-primary transition-colors">Courses</a>
            <a href="#features" className="hover:text-primary transition-colors">Why ARKE</a>
            <a href="#mentors" className="hover:text-primary transition-colors">Mentors</a>
            <a href="#mobile-app" className="hover:text-primary transition-colors">App</a>
            <a href="#faqs" className="hover:text-primary transition-colors">FAQs</a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <button
                onClick={handleDashboardRedirect}
                className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] px-6 py-2.5 text-sm font-bold text-navy shadow-md hover:opacity-95 transition-all duration-200 hover:scale-[1.02]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/10 px-5 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] px-6 py-2.5 text-sm font-bold text-navy shadow-md hover:opacity-95 transition-all duration-200 hover:scale-[1.02]"
                >
                  Get Started
                  <Sparkles className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-border bg-card px-4 pt-3 pb-5 space-y-3"
            >
              <a 
                href="#courses" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-foreground hover:text-primary"
              >
                Courses
              </a>
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-foreground hover:text-primary"
              >
                Why ARKE
              </a>
              <a 
                href="#mentors" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-foreground hover:text-primary"
              >
                Mentors
              </a>
              <a 
                href="#mobile-app" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-foreground hover:text-primary"
              >
                Mobile App
              </a>
              <a 
                href="#faqs" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-foreground hover:text-primary"
              >
                FAQs
              </a>
              
              <div className="pt-3 border-t border-border flex flex-col gap-2.5">
                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleDashboardRedirect(); }}
                    className="w-full text-center rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] py-3 text-sm font-bold text-navy shadow-md"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); setIsLoginModalOpen(true); }}
                      className="w-full text-center rounded-pill border border-primary/40 bg-primary/5 py-2.5 text-sm font-bold text-foreground"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); setIsLoginModalOpen(true); }}
                      className="w-full text-center rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] py-3 text-sm font-bold text-navy shadow-md"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Public Banner Carousel ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BannerCarousel />
      </div>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#070D1F] overflow-hidden pt-6 pb-12 md:pt-10 md:pb-0">
        <div className="max-w-[70rem] mx-auto px-4">
          <div className="grid items-end gap-8 md:gap-6 md:grid-cols-2">
            {/* Hero Left Text & Actions */}
            <div className="text-center md:text-left md:pb-[6rem] order-2 md:order-1">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs md:text-sm font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                India's Rising EdTech Platform
              </span>
              
              <h1 className="mt-4 md:mt-6 font-display">
                <span className="block text-[1.75rem] leading-tight sm:text-3xl font-black text-foreground md:text-5xl lg:text-6xl tracking-tight">
                  JEE, NEET & Foundation
                </span>
                <span className="block text-[1.75rem] leading-tight sm:text-3xl font-black bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] bg-clip-text text-transparent md:text-5xl lg:text-6xl tracking-tight mt-1">
                  Exam Prep That Works
                </span>
              </h1>

              <p className="mt-3 md:mt-5 mx-auto md:mx-0 max-w-lg text-sm md:text-base text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-bold">ARKE Scholars</strong> helps you master JEE Main, JEE Advanced, NEET & Foundation exams with live classes from top educators, AI-powered doubt solving, and smart test analytics.
              </p>

              <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3.5">
                <button
                  onClick={() => user ? router.push("/student/dashboard") : setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] px-7 py-3.5 text-sm md:text-base font-bold text-navy shadow-lg hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
                >
                  {user ? "Explore Courses" : "Get Started"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#courses"
                  className="inline-flex items-center gap-2 rounded-pill border border-border bg-card px-6 py-3.5 text-sm md:text-base font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Browse Courses
                </a>
              </div>
            </div>

            {/* Hero Right Image Illustration */}
            <div className="relative flex justify-center md:justify-end items-end order-1 md:order-2">
              <Image
                src="/hero-image-new-tsp.png"
                alt="ARKE Scholars Mentor guiding students for JEE, NEET and Foundation exams"
                width={720}
                height={620}
                priority
                className="w-auto h-64 sm:h-80 md:h-[36rem] object-contain object-bottom drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Key Stats Bar ────────────────────────────────────────────────── */}
      <section className="bg-card py-8 md:pb-6 md:pt-0 border-y md:border-y-0 border-border">
        <div className="max-w-[70rem] mx-auto px-4 relative md:bottom-10 md:-mb-10">
          <div className="rounded-2xl border border-border bg-card shadow-[0_10px_40px_-12px_rgba(0,0,0,0.12)]">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="flex flex-col items-center text-center gap-2 px-4 py-6 md:py-8">
                <Users className="h-7 w-7 text-primary" />
                <p className="text-2xl md:text-3xl font-black font-display text-foreground">20+</p>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Founding Faculty (IITians)</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 px-4 py-6 md:py-8">
                <FileText className="h-7 w-7 text-primary" />
                <p className="text-2xl md:text-3xl font-black font-display text-foreground">500+</p>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Mock Tests & DPP Sets</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 px-4 py-6 md:py-8">
                <GraduationCap className="h-7 w-7 text-primary" />
                <p className="text-2xl md:text-3xl font-black font-display text-foreground">1-on-1</p>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Personalized Mentorship</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 px-4 py-6 md:py-8">
                <Trophy className="h-7 w-7 text-primary" />
                <p className="text-2xl md:text-3xl font-black font-display text-foreground">100%</p>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Comprehensive Coverage</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Choose Your Exam Section ─────────────────────────────────────── */}
      <section id="courses" className="bg-card py-16 md:py-24">
        <div className="max-w-[70rem] mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tight">
              Choose Your Exam
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Focused preparation tracks tailored for every target competitive goal
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* IIT-JEE Card */}
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="p-3">
                <div className="overflow-hidden rounded-xl bg-[#F7EFD9] dark:bg-[#121C3B] p-4 flex items-center justify-center">
                  <Image
                    src="/exam-svgs/iit-jee.svg"
                    alt="IIT-JEE courses"
                    width={400}
                    height={260}
                    className="h-44 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                <h3 className="mb-4 text-2xl font-black font-display text-foreground">
                  IIT-JEE Main & Advanced
                </h3>
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Strong Subject Conceptual Foundations
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Advanced Problem-Solving Worksheets
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Complete JEE Main & Advanced Syllabus
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    IIT Admission-Focused Test Series
                  </li>
                </ul>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full text-center rounded-xl bg-primary/10 border border-primary/30 py-2.5 text-sm font-bold text-primary group-hover:bg-primary group-hover:text-navy transition-colors"
                >
                  Explore JEE Prep
                </button>
              </div>
            </div>

            {/* NEET Card */}
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="p-3">
                <div className="overflow-hidden rounded-xl bg-[#F7EFD9] dark:bg-[#121C3B] p-4 flex items-center justify-center">
                  <Image
                    src="/exam-svgs/neet.svg"
                    alt="NEET courses"
                    width={400}
                    height={260}
                    className="h-44 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                <h3 className="mb-4 text-2xl font-black font-display text-foreground">
                  NEET UG Medical
                </h3>
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Dedicated Medical Entrance Focus
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    NCERT Line-by-Line Biology Breakdown
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    High-Yield Physics & Chemistry DPPs
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    NTA Replica CBT Mock Test Series
                  </li>
                </ul>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full text-center rounded-xl bg-primary/10 border border-primary/30 py-2.5 text-sm font-bold text-primary group-hover:bg-primary group-hover:text-navy transition-colors"
                >
                  Explore NEET Prep
                </button>
              </div>
            </div>

            {/* Foundation Card */}
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="p-3">
                <div className="overflow-hidden rounded-xl bg-[#F7EFD9] dark:bg-[#121C3B] p-4 flex items-center justify-center">
                  <Image
                    src="/exam-svgs/foundation.svg"
                    alt="Foundation courses"
                    width={400}
                    height={260}
                    className="h-44 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                <h3 className="mb-4 text-2xl font-black font-display text-foreground">
                  Foundation (8th - 10th)
                </h3>
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Classes 8th, 9th & 10th Curriculum
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Olympiad & NTSE Groundwork
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Early Competitive Exam Edge
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Conceptual Science & Math Mastery
                  </li>
                </ul>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full text-center rounded-xl bg-primary/10 border border-primary/30 py-2.5 text-sm font-bold text-primary group-hover:bg-primary group-hover:text-navy transition-colors"
                >
                  Explore Foundation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mobile App Promotion ─────────────────────────────────────────── */}
      <section id="mobile-app" className="bg-primary/5 py-16 md:py-24 border-y border-border">
        <div className="max-w-[70rem] mx-auto px-4">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tight">
                Join thousands of students on the app today!
              </h2>
              <ul className="mt-6 space-y-4 inline-block text-left">
                <li className="flex items-center gap-3.5 text-base md:text-lg text-foreground font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-navy">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </span>
                  Live & recorded classes available at ease
                </li>
                <li className="flex items-center gap-3.5 text-base md:text-lg text-foreground font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-navy">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </span>
                  Smart dashboard for progress tracking
                </li>
                <li className="flex items-center gap-3.5 text-base md:text-lg text-foreground font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-navy">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </span>
                  Lakhs of practice questions & PYQ banks
                </li>
              </ul>

              <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-3 rounded-xl bg-navy px-6 py-3 text-white hover:bg-navy/90 transition-colors shadow-md"
                >
                  <Smartphone className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <span className="block text-[10px] uppercase tracking-wider text-white/70">GET IT ON</span>
                    <span className="block text-base font-bold">Google Play</span>
                  </div>
                </button>
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-3 rounded-xl bg-navy px-6 py-3 text-white hover:bg-navy/90 transition-colors shadow-md"
                >
                  <Smartphone className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <span className="block text-[10px] uppercase tracking-wider text-white/70">Download on the</span>
                    <span className="block text-base font-bold">App Store</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <Image
                src="/mobile-app.png"
                alt="ARKE Scholars mobile app preview"
                width={300}
                height={500}
                className="w-52 md:w-64 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Meet Your Mentors Section ────────────────────────────────────── */}
      <section id="mentors" className="bg-background py-16 md:py-24">
        <div className="max-w-[70rem] mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tight">
              Meet Your Mentors
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              IITians, IIMians & MIT graduates — here to guide your exam journey
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {MENTORS.map((mentor, i) => (
              <div 
                key={i}
                className="flex flex-col items-center text-center rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-primary/40 shadow-inner">
                  <Image
                    src={mentor.image}
                    alt={mentor.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h4 className="font-display font-bold text-lg text-foreground">{mentor.name}</h4>
                <p className="text-xs font-semibold text-primary mt-0.5">{mentor.role}</p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{mentor.exp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why ARKE Features Section ───────────────────────────────────── */}
      <section id="features" className="bg-card py-16 md:py-24 border-t border-border">
        <div className="max-w-[70rem] mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tight">
              Why ARKE Scholars?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Everything you need to crack JEE Main, JEE Advanced & NEET
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">Interactive Live HD Classes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time classroom streaming with live polls, raised hand audio feature, and automatic topic-wise class recordings.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">Structured Study Material</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chapter-wise theory notes, mind maps, formula handbooks, and line-by-line NCERT breakdowns for Physics, Chemistry & Biology.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">NTA-Pattern CBT Mock Tests</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authentic computer-based test replica featuring chapter tests, major mock series, instant score analytics & All India Ranks.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">AI-Powered Analytics</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Smart weakness heatmaps, score predictors, and automated level-wise revision problem recommendations.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">24/7 Doubt Resolution</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Snap & solve photo engine providing instant step-by-step video solutions backed by live mentor assistance.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">1-on-1 Mentorship</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dedicated personal academic counsellors to keep your study schedule on track and build exam confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions ───────────────────────────────────── */}
      <section id="faqs" className="bg-background py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {FAQS.map((faq, index) => (
              <div 
                key={index}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display font-bold text-lg text-foreground hover:text-primary transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openFaq === index ? "rotate-180 text-primary" : ""
                  }`} />
                </button>

                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action Banner ──────────────────────────────────── */}
      <section className="bg-gradient-to-r from-navy via-navy-light to-navy py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white">
            Ready to Crack JEE or NEET?
          </h2>
          <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">
            Join thousands of scholars achieving top ranks with ARKE Scholars today.
          </p>
          <div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-[#E4B94F] via-[#C99A2E] to-[#9A6E1C] px-8 py-4 text-base font-bold text-navy shadow-xl hover:scale-105 transition-transform"
            >
              Start Free Trial Now
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-navy text-white/80 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/arke_logo_light.png"
                alt="ARKE Scholars"
                width={190}
                height={54}
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              India & UAE's premier online coaching platform for JEE Main, JEE Advanced, NEET UG & Foundation exams.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Exam Prep</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#courses" className="hover:text-primary transition-colors">IIT-JEE Main & Advanced</a></li>
              <li><a href="#courses" className="hover:text-primary transition-colors">NEET UG Medical Prep</a></li>
              <li><a href="#courses" className="hover:text-primary transition-colors">Class 8th - 10th Foundation</a></li>
              <li><a href="#courses" className="hover:text-primary transition-colors">NTA Mock Test Series</a></li>
            </ul>
          </div>

          {/* Features Links */}
          <div>
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Features</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-primary transition-colors">Interactive Live Classes</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">NCERT Study Material</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">AI Performance Analytics</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">24/7 Photo Doubt Engine</a></li>
            </ul>
          </div>

          {/* Legal / Contact */}
          <div>
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Contact & Support</h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li>Email: contact@arke.pro</li>
              <li>Website: https://arke.pro</li>
              <li>Regions: India & United Arab Emirates (UAE)</li>
              <li className="pt-2">
                <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                {" · "}
                <Link href="/terms-conditions" className="hover:text-primary transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/50">
          © 2026 ARKE Scholars (arke.pro). All rights reserved.
        </div>
      </footer>

      {/* ─── Login & OTP Modal Component (Preserved) ───────────────────────── */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
