"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ClassRoom from '@/components/meetonline/ClassRoom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Video, User, Phone, BookOpen, ArrowRight } from 'lucide-react';

export default function ClassRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; role: string; className?: string } | null>(null);
  const [mobile, setMobile] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', className: '' });

  useEffect(() => {
    const t = localStorage.getItem('token');
    
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setUser({ username: payload.username || payload.name || 'Student', role: payload.role || 'student' });
        setToken(t);
      } catch (e) {
        setShowGuestForm(true);
      }
    } else {
      setShowGuestForm(true);
    }
    setMounted(true);
  }, []);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.name || !guestForm.phone || !guestForm.className) {
      toast.error('Please fill all fields');
      return;
    }
    
    setUser({ username: guestForm.name, role: 'student', className: guestForm.className });
    setMobile(guestForm.phone);
    setToken('guest-token'); // Give it a dummy token for the API requests that require it
    setShowGuestForm(false);
  };

  if (!mounted) {
    return <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">Loading...</div>;
  }

  if (showGuestForm) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
        {/* Background decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-glow-primary"
            >
              <Video className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-surface-800 dark:text-white font-display tracking-tight">
              Join <span className="text-gradient-primary">Live Class</span>
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
              Please enter your details to access the classroom
            </p>
          </div>
          
          <div className="card p-8 border border-white/40 dark:border-surface-800/50 shadow-2xl backdrop-blur-xl bg-white/60 dark:bg-surface-900/60">
            <form onSubmit={handleGuestSubmit} className="space-y-5">
              <div>
                <label className="form-label text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="text"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                    className="form-input pl-12 h-12 text-sm bg-white/50 dark:bg-surface-950/50 focus:bg-white dark:focus:bg-surface-900 transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                    className="form-input pl-12 h-12 text-sm bg-white/50 dark:bg-surface-950/50 focus:bg-white dark:focus:bg-surface-900 transition-all"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">Class / Standard</label>
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="text"
                    value={guestForm.className}
                    onChange={(e) => setGuestForm({...guestForm, className: e.target.value})}
                    className="form-input pl-12 h-12 text-sm bg-white/50 dark:bg-surface-950/50 focus:bg-white dark:focus:bg-surface-900 transition-all"
                    placeholder="e.g. 10th A"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn-primary w-full h-12 flex items-center justify-center text-sm font-semibold mt-8 shadow-glow-primary"
              >
                Enter Classroom <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!token || !user) {
    return <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">Authenticating...</div>;
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased">
      <ClassRoom
        user={user}
        token={token}
        roomCode={roomCode}
        roomType="live_class"
        mobile={mobile}
        onLeave={() => {
          // Attempt to close the tab (will work if opened via window.open)
          window.close();
          
          // Fallback in case the browser prevents window.close()
          setTimeout(() => {
            if (user.role === 'teacher') router.push('/teacher/live-classes');
            else if (user.role === 'student') router.push('/student/live-classes');
            else if (user.role.includes('admin')) router.push('/admin/live-classes');
            else router.push('/dashboard');
          }, 100);
        }}
      />
    </div>
  );
}
