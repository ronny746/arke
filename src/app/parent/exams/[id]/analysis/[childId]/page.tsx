"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { parentAPI } from '@/api/parent';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';

export default function ChildExamAnalysis() {
  const { id: examId, childId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSubject, setActiveSubject] = useState('');

  useEffect(() => {
    fetchAnalysis();
  }, [examId, childId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await parentAPI.getChildExamAnalysis(examId, childId);
      setData(res.data?.data);
      if (res.data?.data?.subjectStats && Object.keys(res.data.data.subjectStats).length > 0) {
        setActiveSubject(Object.keys(res.data.data.subjectStats)[0]);
      }
    } catch (error) {
      toast.error('Failed to load exam analysis');
      router.push('/parent/exams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!data) return null;

  const { submission, subjectStats, detailedQuestions, totalMarks, score } = data;
  const subjects = subjectStats ? Object.keys(subjectStats) : [];

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalSkipped = 0;

  if (subjectStats) {
    subjects.forEach(sub => {
      totalCorrect += subjectStats[sub].correct || 0;
      totalIncorrect += subjectStats[sub].wrong || 0;
      totalSkipped += (subjectStats[sub].totalQuestions || 0) - (subjectStats[sub].attempted || 0);
    });
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => router.push('/parent/exams')}>Back to Exams</Button>
      </div>

      <PageHeader
        title="Exam Analysis"
        subtitle="Detailed breakdown of your child's performance"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 col-span-1 md:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-surface-500 font-medium">Total Score</p>
              <h3 className="text-3xl font-bold text-surface-900 dark:text-white">
                {score} <span className="text-lg text-surface-400 font-normal">/ {totalMarks}</span>
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 col-span-1 md:col-span-2">
          <div className="grid grid-cols-3 gap-4 h-full">
            <div className="flex flex-col justify-center items-center p-4 rounded-xl bg-success/10 border border-success/20">
              <CheckCircle className="w-6 h-6 text-success mb-2" />
              <p className="text-sm text-surface-600 font-medium">Correct</p>
              <p className="text-2xl font-bold text-success">{totalCorrect}</p>
            </div>
            <div className="flex flex-col justify-center items-center p-4 rounded-xl bg-danger/10 border border-danger/20">
              <XCircle className="w-6 h-6 text-danger mb-2" />
              <p className="text-sm text-surface-600 font-medium">Incorrect</p>
              <p className="text-2xl font-bold text-danger">{totalIncorrect}</p>
            </div>
            <div className="flex flex-col justify-center items-center p-4 rounded-xl bg-warning/10 border border-warning/20">
              <AlertCircle className="w-6 h-6 text-warning mb-2" />
              <p className="text-sm text-surface-600 font-medium">Skipped</p>
              <p className="text-2xl font-bold text-warning">{totalSkipped}</p>
            </div>
          </div>
        </Card>
      </div>

      {subjects.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-surface-900 dark:text-white">Subject-wise Performance</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  activeSubject === subject 
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200"
                )}
              >
                {subject}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <p className="text-sm text-surface-500 mb-1">Score</p>
              <p className="text-xl font-bold">{subjectStats[activeSubject]?.score || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <p className="text-sm text-surface-500 mb-1">Accuracy</p>
              <p className="text-xl font-bold">
                {subjectStats[activeSubject]?.attempted > 0 
                  ? Math.round((subjectStats[activeSubject].correct / subjectStats[activeSubject].attempted) * 100)
                  : 0}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <p className="text-sm text-surface-500 mb-1">Attempted</p>
              <p className="text-xl font-bold">{subjectStats[activeSubject]?.attempted || 0} / {subjectStats[activeSubject]?.totalQuestions || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <p className="text-sm text-surface-500 mb-1">Time Spent</p>
              <p className="text-xl font-bold">{Math.round((subjectStats[activeSubject]?.timeSpent || 0) / 60)} mins</p>
            </div>
          </div>
        </Card>
      )}

      {/* Difficulty & Topic Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty Analysis Card */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-surface-900 dark:text-white">Difficulty-wise Performance</h3>
          <div className="space-y-4">
            {['Easy', 'Medium', 'Hard'].map((diff) => {
              const stats = data.difficultyStats?.[diff] || { totalQuestions: 0, correct: 0, wrong: 0, attempted: 0, accuracy: 0 };
              const colorClass = diff === 'Easy' ? 'bg-success' : diff === 'Medium' ? 'bg-warning' : 'bg-danger';
              const textClass = diff === 'Easy' ? 'text-success' : diff === 'Medium' ? 'text-warning' : 'text-danger';
              const bgLight = diff === 'Easy' ? 'bg-success/5 border-success/10' : diff === 'Medium' ? 'bg-warning/5 border-warning/10' : 'bg-danger/5 border-danger/10';

              return (
                <div key={diff} className={cn("p-4 border rounded-xl", bgLight)}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-surface-950 dark:text-white">{diff} Level</span>
                    <span className={cn("text-sm font-bold", textClass)}>{stats.accuracy}% Accuracy</span>
                  </div>
                  <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2.5 mb-3">
                    <div className={cn("h-2.5 rounded-full", colorClass)} style={{ width: `${stats.accuracy}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-surface-500">
                    <span>Questions: {stats.totalQuestions}</span>
                    <span>Correct: {stats.correct}</span>
                    <span>Wrong: {stats.wrong}</span>
                    <span>Skipped: {stats.totalQuestions - stats.attempted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Topic Analysis Card */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-surface-900 dark:text-white">Topic-wise Performance</h3>
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {Object.keys(data.topicStats || {}).length === 0 ? (
              <p className="text-sm text-surface-500">No topic data available</p>
            ) : (
              Object.keys(data.topicStats || {}).map((topic) => {
                const stats = data.topicStats[topic];
                const status = stats.status; // 'Strong' | 'Medium' | 'Weak'
                const badgeColor = 
                  status === 'Strong' ? 'bg-success/10 text-success border-success/20' :
                  status === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-danger/10 text-danger border-danger/20';

                return (
                  <div key={topic} className="flex items-center justify-between p-3 border border-surface-100 dark:border-surface-800 rounded-xl bg-surface-50 dark:bg-surface-800/50 shadow-sm animate-fade-in">
                    <div>
                      <div className="font-semibold text-surface-900 dark:text-white text-sm">{topic}</div>
                      <div className="text-xs text-surface-500 mt-0.5">
                        Score: <span className="font-semibold text-primary">{stats.score}</span> / {stats.totalMarks} M &middot; Accuracy: {stats.accuracy}%
                      </div>
                    </div>
                    <span className={cn("px-2.5 py-1 text-xs font-bold rounded-full border", badgeColor)}>
                      {status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
      
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Question Details</h3>
          <p className="text-sm text-surface-500">Detailed breakdown of answers for {activeSubject}</p>
        </div>
        <div className="p-6 space-y-8 bg-surface-50 dark:bg-surface-900/50">
          {detailedQuestions.filter(q => {
            const subjectName = (q.subject && typeof q.subject === 'object') ? q.subject.name : (q.subject || 'General');
            return subjectName === activeSubject;
          }).map((q, index) => {
            const isAttempted = q.userAnswer && q.userAnswer.status !== 'NOT_ANSWERED';
            const isCorrect = q.isCorrect;

            return (
              <div key={q._id} className="bg-white dark:bg-surface-900 p-6 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <span className="bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-bold px-3 py-1 rounded">Q {index + 1}</span>
                    <div className="prose max-w-none text-surface-800 dark:text-surface-200" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-medium text-surface-500 whitespace-nowrap">Marks: {q.marks} | -{q.negativeMarks}</span>
                    {!isAttempted ? (
                      <span className="px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs rounded-full font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Skipped</span>
                    ) : isCorrect ? (
                      <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Correct (+{q.userAnswer?.marksObtained || q.marks})</span>
                    ) : (
                      <span className="px-2 py-1 bg-danger/10 text-danger text-xs rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Incorrect (-{q.negativeMarks || 0})</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pl-12">
                  {q.options?.map((opt) => {
                    const isSelected = q.userAnswer && (q.userAnswer.selectedOptionId === opt._id || q.userAnswer.selectedOptionId === opt.id);
                    const isActualCorrect = opt.isCorrect;
                    
                    let borderClass = 'border-surface-200 dark:border-surface-700';
                    let bgClass = 'bg-white dark:bg-surface-900';
                    let icon = null;

                    if (isActualCorrect) {
                      borderClass = 'border-success ring-1 ring-success';
                      bgClass = 'bg-success/5';
                      icon = <CheckCircle className="w-5 h-5 text-success" />;
                    } else if (isSelected && !isActualCorrect) {
                      borderClass = 'border-danger';
                      bgClass = 'bg-danger/5';
                      icon = <XCircle className="w-5 h-5 text-danger" />;
                    }

                    return (
                      <div key={opt._id} className={cn("flex items-center gap-3 p-3 rounded-lg border", borderClass, bgClass)}>
                        <div className="w-5 flex justify-center">{icon}</div>
                        <div className="text-surface-800 dark:text-surface-200" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-4 ml-12 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 text-primary font-semibold mb-2 text-sm">
                      <Award className="w-4 h-4" /> Explanation & Solution
                    </div>
                    <div className="text-surface-700 dark:text-surface-300 text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
