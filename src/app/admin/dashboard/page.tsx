"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, FileCheck, Database, Plus, Users, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const [generatingClass, setGeneratingClass] = useState(false);

  const handleCreateClass = () => {
    setGeneratingClass(true);
    // Generate a random 6 character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    setTimeout(() => {
      toast.success(`Live Class Created: ${code}`);
      router.push(`/class/${code}`);
    }, 800);
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
          Admin Dashboard
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-lg">
          Manage your institution, classes, and examinations.
        </p>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Create Live Class Card */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-accent-500/5 border border-accent-100 dark:border-accent-900/30 hover:shadow-2xl hover:shadow-accent-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <Video size={120} className="text-accent-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30">
              <Video className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Live Classroom</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
              Start a new secure live classroom session and generate a room code to share with your students.
            </p>
            
            <button 
              onClick={handleCreateClass} 
              disabled={generatingClass}
              className="mt-auto w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold shadow-lg shadow-accent-500/30 hover:shadow-accent-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:transform-none"
            >
              {generatingClass ? 'Generating Room...' : <><Plus size={20} /> Create Live Class</>}
            </button>
          </div>
        </motion.div>

        {/* Exams & Results */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-primary-500/5 border border-primary-100 dark:border-primary-900/30 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <FileCheck size={120} className="text-primary-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30">
              <FileCheck className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Exams & Results</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
              Create new examinations, monitor active exams, and publish results to students.
            </p>
            
            <div className="mt-auto flex flex-col gap-3">
              <button onClick={() => router.push('/admin/exams/create')} className="w-full py-3 px-4 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl font-semibold transition-all">
                Create Exam
              </button>
              <button onClick={() => router.push('/admin/exams')} className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                Manage Exams
              </button>
            </div>
          </div>
        </motion.div>

        {/* Question Banks */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-surface-800 shadow-xl shadow-success-500/5 border border-success-100 dark:border-success-900/30 hover:shadow-2xl hover:shadow-success-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <Database size={120} className="text-success-500" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center mb-6 shadow-lg shadow-success-500/30">
              <Database className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">Question Banks</h2>
            <p className="text-surface-500 dark:text-surface-400 mb-8 flex-1">
              Upload documents or manually create rich text question banks to be reused across exams.
            </p>
            
            <button onClick={() => router.push('/admin/question-banks')} className="mt-auto w-full py-3 px-4 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-xl font-semibold shadow-lg shadow-success-500/30 hover:shadow-success-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
              Manage Banks
            </button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
