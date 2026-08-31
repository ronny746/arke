"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, LayoutList, BookOpen, Video, PenTool, FileCheck, Star, ChevronRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { studentAPI } from "@/api/index.js";

export default function MyBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await studentAPI.getMyBatches();
        if (res.data?.success) {
          setBatches(res.data.data || []);
        } else {
          toast.error(res.data?.message || "Failed to load batches");
        }
      } catch (err) {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl bg-white dark:bg-surface-800 p-8 md:p-10 border border-surface-200 dark:border-surface-700 shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <LayoutList size={200} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">
              My Enrolled Courses
            </h1>
            <p className="text-surface-500 dark:text-surface-400">
              Manage your active courses, track progress, and jump directly into your content.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-surface-50 dark:bg-surface-900 px-5 py-3 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-inner">
            <TrendingUp className="text-accent-500" />
            <div>
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">Total Active</p>
              <p className="text-xl font-black text-surface-900 dark:text-white leading-none">{batches.length}</p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-surface-100 dark:bg-surface-800 rounded-3xl animate-pulse border border-surface-200 dark:border-surface-700"></div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-800 rounded-3xl border border-dashed border-surface-200 dark:border-surface-700 shadow-sm">
          <div className="w-20 h-20 bg-surface-50 dark:bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutList size={32} className="text-surface-400" />
          </div>
          <h3 className="text-xl font-bold text-surface-700 dark:text-surface-300">No active batches</h3>
          <p className="text-surface-500 mt-2">You are not enrolled in any courses right now.</p>
          <button onClick={() => window.location.href = '/'} className="mt-6 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-xl shadow-lg shadow-accent-500/20 transition-all">
            Browse Courses
          </button>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {batches.map((batch: any, idx: number) => {
            const course = batch.courseId || {};
            const access = course.access || { studyMaterials: true, liveClasses: true, dpps: true, testSeries: true };
            const isEnded = course.endDate && new Date(course.endDate) < new Date();

            return (
              <motion.div 
                key={batch._id} 
                variants={itemVariants} 
                className={`group flex flex-col bg-white dark:bg-surface-800 rounded-3xl shadow-xl shadow-surface-500/5 border overflow-hidden transition-all duration-300 ${isEnded ? 'border-red-200 dark:border-red-900/50 opacity-80' : 'border-surface-200 dark:border-surface-700 hover:shadow-2xl hover:border-accent-300 dark:hover:border-accent-500/50'}`}
              >
                <div className={`h-32 relative p-6 flex flex-col justify-end bg-gradient-to-br ${
                  isEnded ? 'from-gray-500 to-gray-600 grayscale' :
                  idx % 3 === 0 ? 'from-blue-500 to-indigo-600' : 
                  idx % 3 === 1 ? 'from-emerald-500 to-teal-600' : 
                  'from-violet-500 to-purple-600'
                }`}>
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {course.tag && (
                      <span className="bg-white/90 dark:bg-surface-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-surface-700 dark:text-white shadow-sm">
                        {course.tag}
                      </span>
                    )}
                    <div className="bg-white/90 dark:bg-surface-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-surface-700 dark:text-white shadow-sm flex items-center gap-1">
                      {isEnded ? (
                        <><span className="w-2 h-2 rounded-full bg-red-500"></span> Ended</>
                      ) : (
                        <><span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span> {batch.type || 'Online'}</>
                      )}
                    </div>
                  </div>
                  {/* Abstract design elements */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
                  
                  <h3 className="text-2xl font-bold text-white relative z-10 leading-tight line-clamp-2 drop-shadow-md">
                    {course.name || batch.name}
                  </h3>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Batch Name</p>
                      <p className="text-surface-900 dark:text-white font-semibold flex items-center gap-2">
                        {batch.name} {batch.section && <span className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">Sec {batch.section}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Classmates</p>
                      <p className="text-surface-700 dark:text-surface-300 font-semibold flex items-center justify-end gap-1">
                        <Users size={14} className="text-accent-500" /> {batch.students?.length || 1}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-6 border-t border-surface-100 dark:border-surface-700/50">
                    {access.studyMaterials && (
                      <button onClick={() => router.push('/student/study-materials')} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-primary-50 dark:bg-surface-900/50 dark:hover:bg-primary-900/20 text-surface-700 hover:text-primary-600 dark:text-surface-300 dark:hover:text-primary-400 transition-colors group/btn border border-transparent hover:border-primary-100 dark:hover:border-primary-900/30">
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-800 shadow-sm group-hover/btn:bg-primary-100 dark:group-hover/btn:bg-primary-900/50 transition-colors">
                          <BookOpen size={16} className="text-primary-500" />
                        </div>
                        <span className="text-xs font-bold">Materials</span>
                      </button>
                    )}
                    
                    {access.liveClasses && (
                      <button onClick={() => router.push('/student/live-classes')} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-accent-50 dark:bg-surface-900/50 dark:hover:bg-accent-900/20 text-surface-700 hover:text-accent-600 dark:text-surface-300 dark:hover:text-accent-400 transition-colors group/btn border border-transparent hover:border-accent-100 dark:hover:border-accent-900/30">
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-800 shadow-sm group-hover/btn:bg-accent-100 dark:group-hover/btn:bg-accent-900/50 transition-colors">
                          <Video size={16} className="text-accent-500" />
                        </div>
                        <span className="text-xs font-bold">Live</span>
                      </button>
                    )}
                    
                    {access.dpps && (
                      <button onClick={() => router.push('/student/dpp')} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-orange-50 dark:bg-surface-900/50 dark:hover:bg-orange-900/20 text-surface-700 hover:text-orange-600 dark:text-surface-300 dark:hover:text-orange-400 transition-colors group/btn border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30">
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-800 shadow-sm group-hover/btn:bg-orange-100 dark:group-hover/btn:bg-orange-900/50 transition-colors">
                          <PenTool size={16} className="text-orange-500" />
                        </div>
                        <span className="text-xs font-bold">DPPs</span>
                      </button>
                    )}
                    
                    {access.testSeries && (
                      <button onClick={() => router.push('/student/exams')} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-success-50 dark:bg-surface-900/50 dark:hover:bg-success-900/20 text-surface-700 hover:text-success-600 dark:text-surface-300 dark:hover:text-success-400 transition-colors group/btn border border-transparent hover:border-success-100 dark:hover:border-success-900/30">
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-800 shadow-sm group-hover/btn:bg-success-100 dark:group-hover/btn:bg-success-900/50 transition-colors">
                          <FileCheck size={16} className="text-success-500" />
                        </div>
                        <span className="text-xs font-bold">Exams</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
