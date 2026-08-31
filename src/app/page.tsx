"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  BookOpen, Video, Users, ArrowRight, Shield, Zap, Sparkles, 
  BarChart, Globe, GraduationCap, CheckCircle2, ChevronRight, Award, Target, BookMarked
} from "lucide-react";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B192C] text-[#0B192C] dark:text-surface-50 font-sans selection:bg-[#C99A2E]/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#C99A2E]/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-10%] w-[35rem] h-[35rem] bg-[#E4B94F]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-[#0B192C]/10 dark:bg-[#C99A2E]/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 dark:opacity-10" />
      </div>

      {/* Navbar */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-[#0B192C]/90 backdrop-blur-xl border-b border-surface-200/50 dark:border-surface-800/50 shadow-md py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 flex items-center">
              <img 
                src="/arke_logo.png" 
                alt="ARKE Scholars" 
                className="h-10 w-auto object-contain dark:hidden"
              />
              <img 
                src="/arke_logo_light.png" 
                alt="ARKE Scholars" 
                className="h-10 w-auto object-contain hidden dark:block"
              />
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-surface-700 dark:text-surface-200">
            <a href="#courses" className="hover:text-[#C99A2E] dark:hover:text-[#E4B94F] transition-colors">Courses</a>
            <a href="#features" className="hover:text-[#C99A2E] dark:hover:text-[#E4B94F] transition-colors">Why ARKE</a>
            <a href="#results" className="hover:text-[#C99A2E] dark:hover:text-[#E4B94F] transition-colors">Results</a>
            <a href="#classrooms" className="hover:text-[#C99A2E] dark:hover:text-[#E4B94F] transition-colors">Live Classrooms</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:inline-flex text-sm font-semibold text-surface-700 dark:text-surface-200 hover:text-[#C99A2E] dark:hover:text-[#E4B94F] transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="btn-primary py-2.5 px-6 text-sm font-bold shadow-lg bg-[#C99A2E] hover:bg-[#B28322] text-white rounded-xl transition-all">
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 text-center pt-10 pb-24 md:pt-20 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C99A2E]/10 text-[#C99A2E] dark:text-[#E4B94F] font-bold text-sm mb-8 border border-[#C99A2E]/30 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>INSPIRING EXCELLENCE • JEE & NEET PREPARATION</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight mb-8 leading-[1.1]">
              Crack JEE & NEET <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C99A2E] via-[#E4B94F] to-[#0B192C] dark:to-white">With Expert Educators</span>
            </h1>
            
            <p className="text-lg md:text-xl text-surface-600 dark:text-surface-300 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              ARKE Scholars combines ultra-low latency HD live classrooms, AI-driven adaptive practice, instant doubt resolution, and proctored test series to maximize your rank.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/login" className="btn-primary btn-lg bg-[#C99A2E] hover:bg-[#B28322] text-white px-8 py-4 rounded-xl font-bold w-full sm:w-auto group shadow-xl transition-all">
                Join Student Portal <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform inline-block" />
              </Link>
              <Link href="/login" className="px-8 py-4 rounded-xl font-bold text-[#0B192C] dark:text-white bg-white dark:bg-[#12233D] border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all w-full sm:w-auto shadow-sm hover:shadow-md">
                Admin & Educator Login
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-surface-200/50 dark:border-surface-800/50 bg-white/60 dark:bg-[#12233D]/60 backdrop-blur-md py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-surface-200 dark:divide-surface-800">
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <h4 className="text-4xl font-display font-bold text-[#C99A2E] dark:text-[#E4B94F] mb-2">50,000+</h4>
                <p className="text-sm font-semibold text-surface-500">Enrolled Scholars</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <h4 className="text-4xl font-display font-bold text-[#0B192C] dark:text-white mb-2">200+</h4>
                <p className="text-sm font-semibold text-surface-500">Expert IIT & AIIMS Mentors</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <h4 className="text-4xl font-display font-bold text-[#C99A2E] dark:text-[#E4B94F] mb-2">99.8%</h4>
                <p className="text-sm font-semibold text-surface-500">Exam Qualification Rate</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                <h4 className="text-4xl font-display font-bold text-[#0B192C] dark:text-white mb-2">500+</h4>
                <p className="text-sm font-semibold text-surface-500">Mock & Practice Tests</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Target Courses Section */}
        <section id="courses" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#C99A2E] font-bold text-sm uppercase tracking-wider">Target Programs</span>
            <h2 className="text-3xl md:text-5xl font-display font-bold mt-2 mb-6">Designed for Top Ranks</h2>
            <p className="text-surface-600 dark:text-surface-400 text-lg">Curated curriculum engineered by experienced faculties to simplify complex concepts and build exam confidence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                tag: "ENGINEERING", 
                title: "JEE Main & Advanced", 
                desc: "Comprehensive 1 & 2-year classroom programs with daily DPPs, chapter-wise test series, and previous year paper analyses.",
                icon: Target,
                color: "border-[#C99A2E]"
              },
              { 
                tag: "MEDICAL", 
                title: "NEET UG Preparation", 
                desc: "NCERT-focused biology, organic chemistry, and physics modules with high-yield diagrammatic guides and mock tests.",
                icon: Award,
                color: "border-[#0B192C]"
              },
              { 
                tag: "FOUNDATION", 
                title: "Class 8th to 10th (NTSE/Olympiad)", 
                desc: "Build rock-solid fundamentals in Science & Mathematics early to excel in school exams, Olympiads, and future competitive tests.",
                icon: BookMarked,
                color: "border-[#E4B94F]"
              }
            ].map((course, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`card p-8 group hover:border-[#C99A2E] transition-all bg-white dark:bg-[#12233D] border-t-4 ${course.color} shadow-lg`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#C99A2E]/10 flex items-center justify-center mb-6">
                  <course.icon className="w-6 h-6 text-[#C99A2E]" />
                </div>
                <span className="text-xs font-bold text-[#C99A2E] uppercase tracking-wider">{course.tag}</span>
                <h3 className="text-2xl font-bold mt-1 mb-3 text-[#0B192C] dark:text-white">{course.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 leading-relaxed text-sm mb-6">
                  {course.desc}
                </p>
                <Link href="/login" className="inline-flex items-center text-sm font-bold text-[#C99A2E] hover:underline">
                  Explore Course <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white/40 dark:bg-[#0B192C]/40 border-y border-surface-200/50 dark:border-surface-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-[#C99A2E] font-bold text-sm uppercase tracking-wider">The ARKE Advantage</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold mt-2 mb-6">Everything You Need to Rank Top 100</h2>
              <p className="text-surface-600 dark:text-surface-400 text-lg">Our holistic learning ecosystem equips every scholar with personalized tools and real-time guidance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                { icon: Video, title: "Ultra-Low Latency Live Classes", desc: "Interactive WebRTC streaming with dual-screen view, interactive polls, and instant in-class doubts." },
                { icon: Zap, title: "AI Doubt Resolution", desc: "Instant step-by-step solutions for Physics, Chemistry, and Math questions anytime 24/7." },
                { icon: BarChart, title: "AI All India Test Series (AITS)", desc: "Simulated exam player matching actual NTA / NEET interfaces with detailed subject performance breakdown." },
                { icon: BookOpen, title: "Digital Study Modules & Notes", desc: "Downloadable PDF notes, mind maps, formula sheets, and curated question banks for offline revision." },
                { icon: Users, title: "Parent Progress Dashboard", desc: "Real-time updates on daily attendance, test performance, and study time tracking for parents." },
                { icon: Shield, title: "Proctored Exam Security", desc: "Strict anti-cheat proctoring system with randomized questions and detailed time-per-question analysis." }
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="card p-8 group hover:border-[#C99A2E]/50 transition-colors bg-white/80 dark:bg-[#12233D]/80 backdrop-blur-xl border border-surface-200/60 dark:border-surface-700/60"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#C99A2E]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-[#C99A2E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#0B192C] dark:text-white">{feature.title}</h3>
                  <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-[#0B192C] text-white p-12 text-center shadow-2xl border border-[#C99A2E]/30"
          >
            {/* CTA Background Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#C99A2E] via-[#0B192C] to-[#0B192C]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Ready to Start Your Journey to IIT / AIIMS?</h2>
              <p className="text-surface-300 text-lg mb-10 max-w-2xl mx-auto">
                Sign in to the ARKE Scholars portal to access your courses, live schedules, tests, and study materials.
              </p>
              <Link href="/login" className="btn-primary btn-lg bg-[#C99A2E] hover:bg-[#B28322] text-white font-bold text-lg px-10 py-4 rounded-xl shadow-[0_0_40px_rgba(201,154,46,0.4)]">
                Get Started Now
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0B192C] border-t border-surface-200 dark:border-surface-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img 
                  src="/arke_logo.png" 
                  alt="ARKE Scholars" 
                  className="h-9 w-auto object-contain dark:hidden"
                />
                <img 
                  src="/arke_logo_light.png" 
                  alt="ARKE Scholars" 
                  className="h-9 w-auto object-contain hidden dark:block"
                />
              </div>
              <p className="text-surface-500 text-sm leading-relaxed">
                ARKE Scholars is dedicated to empowering competitive exam aspirants with top-tier education, live classrooms, and AI-driven study solutions.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-[#0B192C] dark:text-white mb-4">Courses</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">JEE Main & Advanced</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">NEET Medical UG</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">Foundation (Class 8-10)</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">All India Test Series (AITS)</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0B192C] dark:text-white mb-4">Portals</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">Student Login</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">Teacher & Educator Portal</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">Parent Progress Portal</Link></li>
                <li><Link href="/login" className="hover:text-[#C99A2E] transition-colors">Admin Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0B192C] dark:text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="https://arke.pro/" target="_blank" rel="noreferrer" className="hover:text-[#C99A2E] transition-colors">About ARKE Scholars</a></li>
                <li><a href="https://arke.pro/" target="_blank" rel="noreferrer" className="hover:text-[#C99A2E] transition-colors">Official Website (arke.pro)</a></li>
                <li><a href="#" className="hover:text-[#C99A2E] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#C99A2E] transition-colors">Terms & Conditions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-surface-200 dark:border-surface-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-surface-500">
            <p>© 2026 ARKE Scholars. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="https://arke.pro/" target="_blank" rel="noreferrer" className="hover:text-[#C99A2E] transition-colors">arke.pro</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
