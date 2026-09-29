'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  UserCheck,
  Compass,
  Target,
  GraduationCap,
  Layers,
  Award,
  Globe2,
  Clock,
  MessageCircleQuestion,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  MapPin,
  Send,
  Zap,
  Phone,
  Mail,
  User,
  School,
} from 'lucide-react';
import ArkeLogo from '@/components/ArkeLogo';

export default function OneOnOnePage() {
  const [selectedGrade, setSelectedGrade] = useState('Grade 10');
  const [selectedCurriculum, setSelectedCurriculum] = useState('CBSE / Foundation');
  const [selectedLocation, setSelectedLocation] = useState('India');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    studentName: '',
    phone: '',
    email: '',
    notes: '',
  });

  const learningSteps = [
    {
      num: '01',
      title: 'Diagnose',
      subtitle: 'Identify Starting Point',
      desc: 'Every learning journey starts by identifying exactly where your child stands — mapping core strengths, learning pace, and hidden concept gaps.',
      icon: Compass,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    },
    {
      num: '02',
      title: 'Teach',
      subtitle: 'Live Interactive 1:1',
      desc: 'Focused, interactive 1:1 sessions built around that starting point. The teacher moves at the speed of your child’s understanding, not a rigid batch schedule.',
      icon: UserCheck,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
      num: '03',
      title: 'Practice',
      subtitle: 'Intelligent Reinforcement',
      desc: 'Intelligent practice designed specifically to reinforce what has been taught with targeted problem sets that build confidence gradually.',
      icon: Target,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    {
      num: '04',
      title: 'Assess',
      subtitle: 'Continuous Assessment',
      desc: 'Continuous real-time assessment that reveals authentic conceptual mastery, critical thinking, and speed — not guesswork or rote memory.',
      icon: Layers,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
    },
    {
      num: '05',
      title: 'Improve',
      subtitle: 'Gaps Closed Proactively',
      desc: 'Gaps are identified and closed before they become bigger roadblocks, ensuring exponential grade improvements and top competitive ranks.',
      icon: TrendingUp,
      color: 'from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
    },
  ];

  const modernFamilyBenefits = [
    {
      icon: Clock,
      title: 'Zero Commute',
      desc: 'No time lost travelling through traffic to tuition centres. High-intensity, distraction-free learning happens safely from home.',
    },
    {
      icon: MessageCircleQuestion,
      title: 'More Room to Ask Questions',
      desc: 'In crowded classrooms, hesitation holds students back. In 1:1 sessions, no question goes unasked or unanswered.',
    },
    {
      icon: TrendingUp,
      title: 'Visible Progress for Parents',
      desc: 'Parents receive clear academic accountability, milestone tracking, and regular actionable feedback — not just a report card twice a year.',
    },
    {
      icon: UserCheck,
      title: 'Personalized Attention, Every Session',
      desc: '100% of the mentor’s energy, lesson plan, and problem sets are shaped around one child — yours.',
    },
  ];

  const globalCentres = [
    {
      region: 'India',
      flag: '🇮🇳',
      tag: 'Pan-India Coverage',
      desc: "Serving ambitious families across India's leading metro cities and educational hubs with top IIT/NIT & senior faculties.",
      metrics: 'Foundation & JEE/NEET Specialist Faculties',
    },
    {
      region: 'Dubai & UAE',
      flag: '🇦🇪',
      tag: 'International & CBSE/IB',
      desc: 'Premium personalized tutoring for Indian and international families in Dubai, Abu Dhabi, and Sharjah.',
      metrics: 'Flexible Time Zones & High-Touch Mentorship',
    },
    {
      region: 'Kuwait',
      flag: '🇰🇼',
      tag: 'Gulf Region Hub',
      desc: 'The same expert-led, 1:1 experience delivered locally with synchronous timing and comprehensive curriculum coverage.',
      metrics: 'Proven Track Record with Gulf Scholars',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#23346B] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#0C8044]/20 selection:text-emerald-600">
      {/* ─── Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#23346B]/95 backdrop-blur-md border-b border-white/10 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 py-1 group">
            <ArkeLogo variant="light" size="md" badge="1:1 TUTORING" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-200">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <a href="#system" className="hover:text-emerald-400 transition-colors">Learning System</a>
            <a href="#coverage" className="hover:text-emerald-400 transition-colors">Classes 6–12</a>
            <a href="#benefits" className="hover:text-emerald-400 transition-colors">Why 1:1</a>
            <a href="#global" className="hover:text-emerald-400 transition-colors">Global Presence</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 text-white/90 hover:bg-white/10 transition-colors"
            >
              LMS Portal
            </Link>
            <a
              href="#book-consultation"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0C8044] to-[#0A6C38] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-900/30 hover:shadow-emerald-500/25 hover:scale-[1.02] transition-all"
            >
              <Calendar className="w-4 h-4" />
              Book Free Trial
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/80 dark:border-slate-800">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#0C8044]/10 dark:bg-emerald-950/40 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Premium 1:1 Online Tutoring for Classes 6–12 | India · Dubai · Kuwait</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              1 Student.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#23346B] via-[#1E40AF] to-[#0C8044] dark:from-blue-400 dark:via-indigo-300 dark:to-emerald-400">
                1 Expert Teacher.
              </span>
              <br />
              1 Learning Journey.
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              <strong className="font-semibold text-slate-900 dark:text-white">True 1:1 Teaching</strong> — No batches, no shared attention. Every session is one student and one dedicated expert teacher who adapts completely to your child.
            </p>

            {/* Call to Actions */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#book-consultation"
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#23346B] via-[#1D3557] to-[#0C8044] px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-950/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
              >
                <span>Book 1:1 Diagnostic & Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#system"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-7 py-4 text-base font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                Explore Learning System
              </a>
            </div>

            {/* 3 Core Value Props in Hero */}
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">True 1:1 Teaching</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  No crowded batches, no fragmented attention. 100% focused attention solely on your child’s unique needs.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">A Teacher Who Adapts</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  The teaching keeps pace with your child, not the other way around. No moving ahead until the concept is crystal clear.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Built Around the Individual</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Curriculum, pacing, and problem difficulty shaped precisely by your child’s academic level, strengths, and aspirations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── The ARKE Learning System Section ──────────────────────── */}
      <section id="system" className="py-20 bg-slate-50/80 dark:bg-[#1E2D5C] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Proven Methodology
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              The ARKE Learning System
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Great tutoring isn't about rushing through chapters — <strong className="text-slate-900 dark:text-white">it is a rigorous, 5-stage continuous improvement system.</strong>
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6">
            {learningSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black font-mono text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors">
                        {step.num}
                      </span>
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${step.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {step.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {idx < learningSteps.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Academic Coverage Section ─────────────────────────────── */}
      <section id="coverage" className="py-20 bg-white dark:bg-[#23346B] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Complete Spectrum
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Academic Coverage, Start to Finish
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              From building foundational curiosity to mastering high-stakes competitive examinations.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Foundation Stage */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 shadow-sm relative overflow-hidden">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
                Foundation Years
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Classes 6 – 10
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                Strong conceptual foundations built early to eliminate exam fear and cultivate mathematical & scientific intuition.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Mathematics, Physics, Chemistry & Biology core mastery',
                  'CBSE, ICSE, IGCSE & IB MYP alignment',
                  'Olympiad & NTSE level analytical problem solving',
                  'Homework support, school exam readiness & continuous doubt clearing',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Senior Stage */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 shadow-sm relative overflow-hidden">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
                Senior & Competitive
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Classes 11 – 12 & Droppers
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                Comprehensive Board and advanced academic preparation for top engineering and medical institutions.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'JEE Main & JEE Advanced specialized 1:1 coaching',
                  'NEET UG Biology, Physics & Chemistry deep-dive mentorship',
                  'CBSE / ISC / State Board 95%+ targeting strategy',
                  'Time management, test temper, and advanced question drills',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Continuous Journey banner */}
          <div className="mt-8 max-w-5xl mx-auto p-6 rounded-2xl bg-[#23346B] text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#0C8044]/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base">One Continuous Journey</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  The same personalized approach carries through seamlessly from foundation years all the way to board and competitive ranks.
                </p>
              </div>
            </div>
            <a
              href="#book-consultation"
              className="shrink-0 px-5 py-2.5 rounded-full bg-[#0C8044] hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors"
            >
              Get Personalized Roadmap
            </a>
          </div>
        </div>
      </section>

      {/* ─── Built for Modern Families ─────────────────────────────── */}
      <section id="benefits" className="py-20 bg-slate-50/80 dark:bg-[#1E2D5C] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Designed for Convenience & Results
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Built for Modern Families
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              A stress-free learning environment that respects your child's time and gives parents total visibility.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modernFamilyBenefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-start hover:border-emerald-500/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {b.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Global Classroom: India · Dubai · Kuwait ──────────────── */}
      <section id="global" className="py-20 bg-white dark:bg-[#23346B] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Cross-Border Academic Excellence
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              A Truly Global Classroom
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              One standard everywhere. The exact same world-class faculty and personalized 1:1 rigor, regardless of geography.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {globalCentres.map((c) => (
              <div
                key={c.region}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{c.flag}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {c.region}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {c.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    {c.metrics}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Families Choose ARKE ─────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-emerald-50/30 dark:from-[#060B1A] dark:to-[#0A1628] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              The ARKE Difference
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Why Families Choose ARKE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Expert Teachers</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Subject specialists and alumni from premier institutes who teach one student at a time, not an anonymous room.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#0C8044]/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Real Academic Accountability</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Progress is tracked, visible, and continuously acted upon with detailed concept analytics and feedback loops.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Not Another Tuition Class</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                A bespoke learning experience crafted exclusively around your child, not just a seat filled in a coaching batch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Consultation Booking Form ─────────────────── */}
      <section id="book-consultation" className="py-20 bg-white dark:bg-[#23346B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#23346B] text-white shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0C8044]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0C8044]/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Book Your 1:1 Diagnostic & Consultation
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Take the First Step Today
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-300">
                Experience the power of dedicated 1:1 guidance with a complimentary academic diagnostic session.
              </p>
            </div>

            {formSubmitted ? (
              <div className="p-8 rounded-2xl bg-white/5 border border-emerald-500/40 text-center max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full bg-[#0C8044]/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Consultation Request Received!</h3>
                <p className="text-sm text-slate-300 mt-2">
                  Our academic counselor will contact you within 24 hours to schedule the 1:1 diagnostic session.
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="mt-6 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto relative z-10">
                {/* Location Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Select Your Country / Region
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['India', 'Dubai (UAE)', 'Kuwait'].map((loc) => (
                      <button
                        type="button"
                        key={loc}
                        onClick={() => setSelectedLocation(loc)}
                        className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                          selectedLocation === loc
                            ? 'bg-[#0C8044] text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade & Curriculum Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Student Grade / Class
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Grade 6" className="bg-slate-900 text-white">Class 6</option>
                      <option value="Grade 7" className="bg-slate-900 text-white">Class 7</option>
                      <option value="Grade 8" className="bg-slate-900 text-white">Class 8</option>
                      <option value="Grade 9" className="bg-slate-900 text-white">Class 9</option>
                      <option value="Grade 10" className="bg-slate-900 text-white">Class 10</option>
                      <option value="Grade 11" className="bg-slate-900 text-white">Class 11</option>
                      <option value="Grade 12" className="bg-slate-900 text-white">Class 12</option>
                      <option value="Dropper / Repeater" className="bg-slate-900 text-white">Dropper / Repeater</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Target Curriculum / Goal
                    </label>
                    <select
                      value={selectedCurriculum}
                      onChange={(e) => setSelectedCurriculum(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="CBSE / Foundation" className="bg-slate-900 text-white">CBSE / Foundation</option>
                      <option value="ICSE / IGCSE / IB" className="bg-slate-900 text-white">ICSE / IGCSE / IB</option>
                      <option value="JEE Main & Advanced" className="bg-slate-900 text-white">JEE Main & Advanced</option>
                      <option value="NEET UG Medical" className="bg-slate-900 text-white">NEET UG Medical</option>
                    </select>
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Parent's Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Sharma"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full rounded-xl bg-white/5 border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Student's Name
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav Sharma"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full rounded-xl bg-white/5 border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      WhatsApp / Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl bg-white/5 border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl bg-white/5 border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0C8044] to-[#0A6C38] text-white font-bold text-base shadow-lg shadow-emerald-950/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Request Free 1:1 Diagnostic Session
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-[#15234B] text-slate-400 py-12 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ArkeLogo variant="light" size="sm" />
          </div>
          <div className="flex flex-wrap gap-6 text-slate-300">
            <Link href="/" className="hover:text-emerald-400">Home</Link>
            <Link href="/privacy-policy" className="hover:text-emerald-400">Privacy Policy</Link>
            <Link href="/terms-conditions" className="hover:text-emerald-400">Terms & Conditions</Link>
            <Link href="/refund-cancellation" className="hover:text-emerald-400">Refund Policy</Link>
          </div>
          <p>© 2026 ARKE Scholars (arke.pro). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
