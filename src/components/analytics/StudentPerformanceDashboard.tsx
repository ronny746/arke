import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed recharts
import { Award, BookOpen, Clock, Target, CheckCircle, XCircle, AlertCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/index.jsx';
import axiosInstance from '@/api/axiosInstance.js';
import toast from 'react-hot-toast';

import { ChevronUp } from 'lucide-react';

const ComprehensiveAccordion = ({ data }) => {
  const [expandedSubject, setExpandedSubject] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-surface-500 p-4">No detailed analysis available yet.</p>;
  }

  return (
    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 pb-4">
      {data.map((subjNode) => {
        const subject = subjNode.subject;
        const isExpanded = expandedSubject === subject;
        const isNegative = subjNode.marksObtained < 0;

        return (
          <div key={subject} className={`bg-white dark:bg-surface-800 rounded-xl border transition-all duration-300 shadow-sm ${isExpanded ? 'border-primary-200 ring-1 ring-primary-100' : 'border-surface-200 hover:border-primary-300'}`}>
            <div 
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/50 dark:bg-primary-900/10 rounded-t-xl' : 'rounded-xl'}`}
              onClick={() => setExpandedSubject(isExpanded ? null : subject)}
            >
              <h4 className="text-xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-3 mb-3 sm:mb-0">
                <div className={`w-1.5 h-6 rounded-full transition-colors ${isExpanded ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}></div>
                {subject}
              </h4>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="text-sm font-semibold text-surface-600 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 px-4 py-1.5 rounded-full shadow-sm">
                  Score: <span className={isNegative ? 'text-rose-600' : 'text-primary-600'}>{subjNode.marksObtained}</span> / {subjNode.totalPossibleMarks}
                </div>
                <div className="text-sm font-semibold text-surface-600 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 px-4 py-1.5 rounded-full shadow-sm">
                  Total Questions: <span className="text-primary-600">{subjNode.totalQuestions || subjNode.topics?.reduce((sum, t) => sum + (t.totalQuestions || 0), 0) || 0}</span>
                </div>
                <div className="text-surface-400 bg-surface-50 dark:bg-surface-800 p-1.5 rounded-full hover:bg-surface-100 transition-colors ml-auto sm:ml-0">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>
            
            {isExpanded && (
              <div className="p-5 border-t border-surface-100 dark:border-surface-700 bg-white dark:bg-surface-800 rounded-b-xl space-y-4">
                {subjNode.topics && subjNode.topics.length > 0 ? (
                  subjNode.topics.map(topNode => {
                    const topicAcc = parseFloat(topNode.accuracy);
                    const isWeak = topicAcc < 50;
                    
                    return (
                      <div key={topNode.topic} className="bg-surface-50 dark:bg-surface-900/50 rounded-xl p-4 border border-surface-100 dark:border-surface-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-surface-200 dark:border-surface-700 gap-2">
                          <h5 className="font-bold text-surface-800 dark:text-surface-200 text-lg flex items-center gap-2">
                            {topNode.topic}
                            {isWeak && <span className="text-[10px] uppercase font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">Weak</span>}
                          </h5>
                          <div className="flex gap-4">
                             <span className="text-sm font-bold text-surface-600 dark:text-surface-400">Score: <span className={topNode.marksObtained < 0 ? 'text-rose-600' : 'text-primary-600'}>{topNode.marksObtained}</span> / {topNode.totalPossibleMarks}</span>
                             <span className="text-sm font-bold text-surface-600 dark:text-surface-400">Questions: <span className="text-primary-600">{topNode.totalQuestions || (topNode.difficulties?.reduce((sum, d) => sum + (d.totalQuestions || 0), 0) || 0)}</span></span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {['Easy', 'Medium', 'Hard'].map(diff => {
                            const diffNode = topNode.difficulties?.find(d => d.difficulty === diff) || {
                              difficulty: diff,
                              totalQuestions: 0,
                              attempted: 0,
                              correct: 0,
                              wrong: 0,
                              marksObtained: 0,
                              totalPossibleMarks: 0,
                              accuracy: 0
                            };
                            
                            const colorClass = diff === 'Easy' ? 'bg-success-500 text-success-600' : diff === 'Medium' ? 'bg-amber-500 text-amber-600' : 'bg-rose-500 text-rose-600';
                            
                            return (
                              <div key={diff} className="bg-white dark:bg-surface-800 p-4 rounded-lg shadow-sm border border-surface-100 dark:border-surface-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-surface-100 dark:border-surface-700">
                                  <span className={`font-bold ${colorClass.split(' ')[1]}`}>{diff} Level</span>
                                  <span className="text-xs font-semibold text-surface-500 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full">{diffNode.totalQuestions} Questions</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs font-medium mb-3">
                                  <div className="flex justify-between p-2 rounded bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400">
                                    <span>Correct:</span> <span>{diffNode.correct}</span>
                                  </div>
                                  <div className="flex justify-between p-2 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400">
                                    <span>Wrong:</span> <span>{diffNode.wrong}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-medium mb-3">
                                  <div className="flex justify-between p-2 rounded bg-surface-100 dark:bg-surface-700 text-surface-600">
                                    <span>Attempted:</span> <span>{diffNode.attempted}</span>
                                  </div>
                                  <div className="flex justify-between p-2 rounded bg-surface-100 dark:bg-surface-700 text-surface-600">
                                    <span>Unattempted:</span> <span>{diffNode.totalQuestions - diffNode.attempted}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-bold">
                                  <span>Score:</span> <span>{diffNode.marksObtained} / {diffNode.totalPossibleMarks}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-surface-500 text-sm">No topics recorded for this subject.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function StudentPerformanceDashboard({ studentId, onExamClick, onDppClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('EXAMS'); // 'EXAMS' | 'DPPS'

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

  const { overall, subjectWise, recentExams, dppData } = data;
  const dppOverall = dppData?.overall || { totalDppsTaken: 0, averageScore: 0, overallPercentage: 0 };
  const recentDpps = dppData?.recentDpps || [];

  const statCards = [
    { label: 'Exams Taken', value: overall.totalExamsTaken, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Avg Score', value: `${overall.averageScore}`, icon: Target, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Overall Acc.', value: `${overall.overallPercentage}%`, icon: Award, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  const renderExamsTab = () => (
    <>
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

      <Card className="p-6 overflow-hidden">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Target className="text-primary-500" /> Comprehensive Exam Performance Breakdown
        </h3>
        <ComprehensiveAccordion data={subjectWise} />
      </Card>

      <Card className="p-6 overflow-hidden">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Clock className="text-primary-500" /> Past Exams History
        </h3>
        {recentExams && recentExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="pb-3 font-semibold text-surface-500">Exam Title</th>
                  <th className="pb-3 font-semibold text-surface-500">Date</th>
                  <th className="pb-3 font-semibold text-surface-500">Score</th>
                  <th className="pb-3 font-semibold text-surface-500">Accuracy</th>
                  <th className="pb-3 font-semibold text-surface-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam, idx) => {
                  const accuracy = exam.totalCorrect + exam.totalWrong > 0 
                    ? ((exam.totalCorrect / (exam.totalCorrect + exam.totalWrong)) * 100).toFixed(1) 
                    : 0;
                    
                  return (
                    <motion.tr 
                      key={exam.submissionId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <td className="py-4">
                        <p className="font-semibold text-surface-900 dark:text-surface-100">{exam.examTitle}</p>
                        <p className="text-xs text-surface-500">{exam.examType}</p>
                      </td>
                      <td className="py-4 text-surface-600 dark:text-surface-400 text-sm">
                        {new Date(exam.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-medium">
                        <span className={exam.score < 0 ? 'text-rose-500' : 'text-primary-600 dark:text-primary-400'}>{exam.score}</span>
                        <span className="text-surface-400 text-xs ml-1">/ {exam.totalMarks}</span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          accuracy >= 80 ? 'bg-success-100 text-success-700' : 
                          accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {accuracy}%
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => onExamClick && onExamClick(exam.examId, exam.submissionId)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline"
                        >
                          Analysis
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-surface-500 py-6">No past exams found.</p>
        )}
      </Card>
    </>
  );

  const renderDppsTab = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-100 text-blue-500">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-surface-500 font-medium text-sm uppercase tracking-wider mb-1">DPPs Taken</p>
            <h4 className="text-3xl font-bold text-surface-900 dark:text-white">{dppOverall.totalDppsTaken}</h4>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-100 text-green-500">
            <Target size={28} />
          </div>
          <div>
            <p className="text-surface-500 font-medium text-sm uppercase tracking-wider mb-1">Avg Score</p>
            <h4 className="text-3xl font-bold text-surface-900 dark:text-white">{dppOverall.averageScore}</h4>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-purple-100 text-purple-500">
            <Award size={28} />
          </div>
          <div>
            <p className="text-surface-500 font-medium text-sm uppercase tracking-wider mb-1">Overall Acc.</p>
            <h4 className="text-3xl font-bold text-surface-900 dark:text-white">{dppOverall.overallPercentage}%</h4>
          </div>
        </motion.div>
      </div>

      <Card className="p-6 overflow-hidden">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Target className="text-primary-500" /> Comprehensive DPP Performance Breakdown
        </h3>
        <ComprehensiveAccordion data={dppData?.subjectWise || []} />
      </Card>

      <Card className="p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="text-purple-500" /> DPP Performance History
          </h3>
        </div>
        
        {recentDpps && recentDpps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 text-surface-500">
                  <th className="pb-4 font-semibold p-4">DPP Title</th>
                  <th className="pb-4 font-semibold p-4">Date</th>
                  <th className="pb-4 font-semibold p-4 text-center">Score</th>
                  <th className="pb-4 font-semibold p-4 text-center">Time Spent</th>
                  <th className="pb-4 font-semibold p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {recentDpps.map((dpp, i) => (
                  <motion.tr 
                    key={dpp.sessionId || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-surface-50 dark:hover:bg-surface-900/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-surface-900 dark:text-white">{dpp.title || 'Practice Session'}</div>
                    </td>
                    <td className="p-4 text-surface-600 dark:text-surface-300 text-sm">
                      {new Date(dpp.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-bold text-purple-600 dark:text-purple-400 text-lg">{dpp.score} / {dpp.totalMarks}</div>
                      <div className="text-xs text-surface-500">{dpp.percentage}%</div>
                    </td>
                    <td className="p-4 text-center text-surface-600 text-sm">
                      {Math.floor((dpp.totalTimeSpentSeconds || 0) / 60)}m {(dpp.totalTimeSpentSeconds || 0) % 60}s
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => onDppClick ? onDppClick(dpp.sessionId) : window.open(`/student/dpp/${dpp.sessionId}/play`, '_blank')}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-surface-500 py-6">No past DPPs found.</p>
        )}
      </Card>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex border-b border-surface-200 dark:border-surface-700 overflow-x-auto no-scrollbar">
        <button
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'EXAMS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-700'}`}
          onClick={() => setActiveTab('EXAMS')}
        >
          Exam Performance
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'DPPS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-700'}`}
          onClick={() => setActiveTab('DPPS')}
        >
          DPP Performance
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {activeTab === 'EXAMS' ? renderExamsTab() : renderDppsTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
