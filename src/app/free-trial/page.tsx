"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, User, Phone, Mail, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FreeTrialPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    targetYear: "2024",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // For now just redirect to login after capture
      router.push("/login?trial=requested");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6 flex items-center justify-between z-10">
        <Link href="/">
          <Image src="/SKD-logo.png" alt="SKD Xpress" width={140} height={50} className="h-9 w-auto object-contain" />
        </Link>
        <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-[300px]" style={{ background: "linear-gradient(135deg, #0033a0 0%, #7b3fa0 100%)" }} />

        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-5 bg-white rounded-3xl shadow-2xl overflow-hidden z-10 relative">
          
          {/* Left Panel: Info */}
          <div className="lg:col-span-2 p-10 text-white relative flex flex-col justify-between" style={{ background: "linear-gradient(180deg, #e8470a 0%, #d97706 100%)" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='2' fill='white'/%3E%3C/svg%3E\")", backgroundSize: "20px 20px" }} />
            
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-4 leading-tight">Start Your<br/>7-Day Free Trial</h2>
              <p className="text-white/80 font-medium mb-8">Experience the best NEET preparation platform with complete access to all features.</p>
              
              <ul className="space-y-4">
                {[
                  "Live Interactive Classes",
                  "Chapter-wise DPPs",
                  "Full-length Mock Tests",
                  "AI Performance Analytics",
                  "1-on-1 Doubt Resolution"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 font-semibold text-sm text-white/90">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative z-10 mt-12 bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20">
              <p className="text-sm font-bold mb-1">"Best platform for NEET prep!"</p>
              <p className="text-xs text-white/70 italic">— Rahul V., AIR 45</p>
            </div>
          </div>

          {/* Right Panel: Form */}
          <div className="lg:col-span-3 p-10 sm:p-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-black text-gray-900 mb-2">Claim Your Free Access</h3>
              <p className="text-gray-500 text-sm mb-8">Enter your details below to activate your 7-day free trial instantly. No credit card required.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033a0] focus:border-transparent transition-all font-medium"
                      placeholder="e.g. Anjali Singh"
                    />
                  </div>
                </div>

                {/* Phone & Target Year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033a0] focus:border-transparent transition-all font-medium"
                        placeholder="+91"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Year</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                      </div>
                      <select
                        value={formData.targetYear}
                        onChange={(e) => setFormData({...formData, targetYear: e.target.value})}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0033a0] focus:border-transparent transition-all font-medium appearance-none"
                      >
                        <option value="2024">NEET 2024</option>
                        <option value="2025">NEET 2025</option>
                        <option value="2026">NEET 2026</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033a0] focus:border-transparent transition-all font-medium"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0033a0, #7b3fa0)", boxShadow: "0 8px 25px rgba(0,51,160,0.25)" }}
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Activate Free Trial <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-xs text-gray-400 mt-6 font-medium">
                  By signing up, you agree to our Terms of Service & Privacy Policy.
                </p>
              </form>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
