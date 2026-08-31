"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  BookOpen, Video, Users, ArrowRight, Shield, Zap, Sparkles, 
  BarChart, Globe, GraduationCap, CheckCircle2, ChevronRight 
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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 font-sans selection:bg-primary-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-10%] w-[35rem] h-[35rem] bg-accent-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-secondary-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 dark:opacity-10" />
      </div>

      {/* Navbar */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/70 dark:bg-surface-950/70 backdrop-blur-xl border-b border-surface-200/50 dark:border-surface-800/50 shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow-primary">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">LMS<span className="text-primary-600 dark:text-primary-400">Portal</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-surface-600 dark:text-surface-300">
            <a href="#features" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Features</a>
            <a href="#classrooms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Live Classrooms</a>
            <a href="#testimonials" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Success Stories</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:inline-flex text-sm font-semibold text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="btn-primary py-2 px-5 text-sm shadow-glow-primary">
              Get Started
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium text-sm mb-8 border border-primary-500/20 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Introducing Live Interactive Classrooms v2.0</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight mb-8 leading-[1.1]">
              Elevate Your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-accent-500 to-secondary-500">Learning Experience</span>
            </h1>
            
            <p className="text-lg md:text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              A unified, premium platform designed for institutes and students. Seamlessly combining interactive study materials, ultra-low latency live classrooms, and powerful assessments.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/login" className="btn-primary btn-lg w-full sm:w-auto group shadow-glow-primary">
                Join as Student <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="px-8 py-4 rounded-xl font-bold text-surface-700 dark:text-surface-200 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all w-full sm:w-auto shadow-sm hover:shadow-md">
                Institute / Admin Login
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-surface-200/50 dark:border-surface-800/50 bg-white/40 dark:bg-surface-900/40 backdrop-blur-md py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-surface-200 dark:divide-surface-800">
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <h4 className="text-4xl font-display font-bold text-surface-900 dark:text-white mb-2">500+</h4>
                <p className="text-sm font-medium text-surface-500">Partner Institutes</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <h4 className="text-4xl font-display font-bold text-surface-900 dark:text-white mb-2">10M+</h4>
                <p className="text-sm font-medium text-surface-500">Active Students</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <h4 className="text-4xl font-display font-bold text-surface-900 dark:text-white mb-2">99.9%</h4>
                <p className="text-sm font-medium text-surface-500">Uptime SLA</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                <h4 className="text-4xl font-display font-bold text-surface-900 dark:text-white mb-2">4.9/5</h4>
                <p className="text-sm font-medium text-surface-500">Average Rating</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Everything you need to succeed</h2>
            <p className="text-surface-600 dark:text-surface-400 text-lg">Our platform provides a comprehensive suite of tools designed to make online education as effective and engaging as in-person learning.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: BookOpen, color: "primary", title: "Interactive Courseware", desc: "Rich text, embedded videos, and interactive quizzes that adapt to your learning pace." },
              { icon: Video, color: "accent", title: "HD Live Classrooms", desc: "Ultra-low latency WebRTC streaming with whiteboard, screen sharing, and live chat." },
              { icon: Users, color: "secondary", title: "Seamless Collaboration", desc: "Real-time group discussions, peer-to-peer file sharing, and collaborative notes." },
              { icon: BarChart, color: "success", title: "Advanced Analytics", desc: "AI-driven insights into student performance, attendance tracking, and engagement metrics." },
              { icon: Shield, color: "warning", title: "Secure Assessments", desc: "Proctored exams, randomized question banks, and instant grading with detailed feedback." },
              { icon: Globe, color: "info", title: "Accessible Anywhere", desc: "Fully responsive design that works flawlessly on desktops, tablets, and mobile devices." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="card p-8 group hover:border-primary-500/50 transition-colors bg-white/60 dark:bg-surface-900/60 backdrop-blur-xl"
              >
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-surface-900 dark:text-white">{feature.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-surface-900 text-white p-12 text-center"
          >
            {/* CTA Background Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500 via-surface-900 to-surface-900" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Ready to transform your institution?</h2>
              <p className="text-surface-300 text-lg mb-10 max-w-2xl mx-auto">
                Join thousands of educators and students who are already using our platform to redefine the educational experience.
              </p>
              <Link href="/login" className="btn-primary btn-lg bg-white text-surface-900 hover:bg-surface-50 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Get Started for Free
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold font-display tracking-tight">LMS<span className="text-primary-600 dark:text-primary-400">Portal</span></span>
              </div>
              <p className="text-surface-500 text-sm leading-relaxed">
                Empowering the next generation of learners with cutting-edge educational technology and immersive virtual classrooms.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-surface-900 dark:text-white mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Interactive Courses</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Live Classrooms</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Assessments</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Analytics Dashboard</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-surface-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Teacher Guides</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Community Forum</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-surface-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-surface-500">
                <li><a href="#" className="hover:text-primary-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-surface-200 dark:border-surface-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-surface-500">
            <p>© 2026 LMSPortal. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
