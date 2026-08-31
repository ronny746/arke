import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// Removed recharts
import { Award, BookOpen, Clock, Target, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/index.jsx';
import axiosInstance from '@/api/axiosInstance.js';
import toast from 'react-hot-toast';

export default function StudentPerformanceDashboard({ studentId, onExamClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/analytics-reports/student/${studentId}/performance`);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to fetch student performance data');
      } finally {
        setLoading(false);
      }
    };
    if (studentId) {
      fetchPerformance();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.overall.totalExamsTaken === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 dark:bg-surface-900/50 rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">No Performance Data Yet</h3>
        <p className="text-surface-500 max-w-md mx-auto">
          Take some exams to start seeing your performance analytics, subject-wise strengths, and detailed reports here.
        </p>
      </div>
    );
  }

  const { overall, subjectWise, recentExams } = data;

  const statCards = [
    { label: 'Exams Taken', value: overall.totalExamsTaken, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Avg Score', value: `${overall.averageScore}`, icon: Target, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Overall Acc.', value: `${overall.overallPercentage}%`, icon: Award, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-6 flex items-center gap-5 shadow-sm"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-surface-500 font-medium text-sm uppercase tracking-wider mb-1">{stat.label}</p>
              <h4 className="text-3xl font-bold text-surface-900 dark:text-white">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Wise Accuracy - Custom Progress Bars */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Target className="text-primary-500" /> Subject-wise Accuracy
          </h3>
          <div className="space-y-6">
            {subjectWise.map((subject, idx) => {
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
              const color = colors[idx % colors.length];
              return (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-surface-700 dark:text-surface-200">{subject.subject}</span>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{subject.accuracy}%</span>
                  </div>
                  <div className="w-full bg-surface-100 dark:bg-surface-800 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, subject.accuracy))}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-full ${color} rounded-full`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>Correct: {subject.correct}</span>
                    <span>Attempted: {subject.attempted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Subject Wise Score - Custom Progress Bars */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Award className="text-primary-500" /> Subject-wise Score Percentage
          </h3>
          <div className="space-y-6">
            {subjectWise.map((subject, idx) => {
              const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
              const color = colors[idx % colors.length];
              // Handle negative percentages gracefully
              const displayPercentage = Math.max(0, Math.min(100, subject.percentage));
              
              return (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-surface-700 dark:text-surface-200">{subject.subject}</span>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{subject.percentage}%</span>
                  </div>
                  <div className="w-full bg-surface-100 dark:bg-surface-800 h-3 rounded-full overflow-hidden relative">
                    {/* Zero line indicator if there are negative scores */}
                    {subject.percentage < 0 && (
                      <div className="absolute top-0 bottom-0 left-0 bg-red-500 h-full w-2" title="Negative Score" />
                    )}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${displayPercentage}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className={`h-full ${color} rounded-full`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>Score: {subject.marksObtained}</span>
                    <span>Total: {subject.totalPossibleMarks}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Past Tests List */}
      <Card className="p-6 overflow-hidden">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Clock className="text-primary-500" /> Past Exams History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 text-surface-500">
                <th className="pb-4 font-semibold p-4">Exam Title</th>
                <th className="pb-4 font-semibold p-4">Date</th>
                <th className="pb-4 font-semibold p-4 text-center">Correct/Wrong</th>
                <th className="pb-4 font-semibold p-4 text-center">Score</th>
                <th className="pb-4 font-semibold p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {recentExams.map((exam, i) => (
                <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-900/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-surface-900 dark:text-white">{exam.examTitle}</div>
                    <div className="text-xs text-surface-500 bg-surface-100 dark:bg-surface-800 inline-block px-2 py-0.5 rounded mt-1">
                      {exam.examType}
                    </div>
                  </td>
                  <td className="p-4 text-surface-600 dark:text-surface-300">
                    {new Date(exam.date).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium"><CheckCircle size={14}/> {exam.totalCorrect}</span>
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium"><XCircle size={14}/> {exam.totalWrong}</span>
                      <span className="flex items-center gap-1 text-surface-500 text-sm font-medium"><AlertCircle size={14}/> {exam.totalUnattempted}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="font-bold text-primary-600 dark:text-primary-400 text-lg">{exam.score} / {exam.totalMarks}</div>
                    <div className="text-xs text-surface-500">{exam.percentage}%</div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onExamClick && onExamClick(exam.examId, exam.submissionId)}
                      className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      View Solutions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentExams.length === 0 && (
            <div className="text-center py-8 text-surface-500">No past exams found.</div>
          )}
        </div>
      </Card>
      
    </div>
  );
}
