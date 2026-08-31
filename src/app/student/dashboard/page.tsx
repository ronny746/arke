"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Video, FileCheck, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { studentAPI } from '@/api/index.js';

export default function StudentDashboard() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [activeClasses, setActiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveClasses = async () => {
      try {
        setLoading(true);
        // The backend filters live classes based on the user's assigned classes
        const res = await studentAPI.getLiveClasses();
        // filter out only ONGOING ones
        const ongoing = (res.data?.data || []).filter(c => c.status === 'ONGOING');
        setActiveClasses(ongoing);
      } catch (err) {
        console.error("Failed to fetch live classes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveClasses();
  }, []);

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    router.push(`/class/${roomCode.toUpperCase()}`);
  };

  const handleJoinAutoClass = (roomCodeStr) => {
    router.push(`/class/${roomCodeStr}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="animate-fade-in p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-surface-900 to-surface-600 dark:from-white dark:to-surface-400">
          Welcome back
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-lg">
          Ready to continue your learning journey?
        </p>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Join Live Class Card */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-accent-500/5 border border-accent-100 dark:border-accent-900/30 hover:shadow-2xl hover:shadow-accent-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <Video size={120} className="text-accent-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30">
              <Video className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Live Classroom</h2>
            
            {!loading && activeClasses.length > 0 ? (
              <div className="flex-1 flex flex-col gap-3 mb-6">
                <p className="text-sm font-semibold text-accent-500">Live Now for Your Class:</p>
                {activeClasses.map(ac => (
                  <div key={ac._id} className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{ac.classScheduleId?.subjectId?.name || 'Class Session'}</p>
                      <p className="text-xs text-surface-500">Code: {ac.roomCode}</p>
                    </div>
                    <button 
                      onClick={() => handleJoinAutoClass(ac.roomCode)}
                      className="p-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg shadow transition"
                    >
                      <Play size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
                Join an ongoing interactive session using the secure room code provided by your teacher.
              </p>
            )}

            <form onSubmit={handleJoinClass} className="flex flex-col gap-3 mt-auto">
              <input 
                type="text" 
                placeholder="Enter Code (e.g. ABCD12)" 
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-center uppercase tracking-[0.2em] font-mono font-bold focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
              />
              <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold shadow-lg shadow-accent-500/30 hover:shadow-accent-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                Join via Code
              </button>
            </form>
          </div>
        </motion.div>

        {/* Online Tests Card */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-success-500/5 border border-success-100 dark:border-success-900/30 hover:shadow-2xl hover:shadow-success-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <FileCheck size={120} className="text-success-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center mb-6 shadow-lg shadow-success-500/30">
              <FileCheck className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Online Tests</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
              View your upcoming scheduled exams, attempt tests, and check your detailed performance analysis.
            </p>
            
            <button onClick={() => router.push('/student/exams')} className="mt-auto w-full py-3 px-4 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-xl font-semibold shadow-lg shadow-success-500/30 hover:shadow-success-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
              Go to Exams
            </button>
          </div>
        </motion.div>

        {/* Study Materials Card */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-primary-500/5 border border-primary-100 dark:border-primary-900/30 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <BookOpen size={120} className="text-primary-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Study Materials</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
              Access your digital textbooks, reading assignments, shared notes, and interactive content.
            </p>
            
            <button className="mt-auto w-full py-3 px-4 bg-surface-100 hover:bg-surface-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-surface-800 dark:text-white rounded-xl font-semibold transition-all">
              Coming Soon
            </button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
