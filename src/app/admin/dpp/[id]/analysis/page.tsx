"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Award } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import axiosInstance from '@/api/axiosInstance.js';
import toast from 'react-hot-toast';

export default function DPPAnalysisReport() {
  const { id } = useParams();
  const router = useRouter();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await axiosInstance.get(`/student/practice/${id}`);
        const data = res.data.data;
        setSession(data);
        
        if (data.questions && data.questions.length > 0) {
          const firstSubj = data.questions[0].subjectName || 'General';
          setActiveSubject(firstSubj);
        }
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load DPP session');
        router.back();
      }
    };
    loadSession();
  }, [id, router]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!session) return null;

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const questions = session.questions || [];
  
  // Calculate real total time if backend returned 0 due to previous bug
  const computedTotalTime = session.answers?.reduce((acc, curr) => acc + (curr.timeSpentSeconds || 0), 0) || 0;
  const displayTotalTime = session.totalTimeSpentSeconds > 0 ? session.totalTimeSpentSeconds : computedTotalTime;
  
  // Subject grouping
  const subjectGroups = {};
  questions.forEach((q, idx) => {
    const subj = q.subjectName || 'General';
    if (!subjectGroups[subj]) subjectGroups[subj] = [];
    subjectGroups[subj].push({ ...q, originalIndex: idx });
  });

  const subjects = Object.keys(subjectGroups);

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => router.back()}>Back</Button>
      </div>

      <PageHeader
        title="DPP Analysis Report"
        subtitle={session.title || 'Practice Session'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex flex-col justify-center items-center text-center">
          <Award className="w-12 h-12 opacity-80 mb-2" />
          <h2 className="text-xl font-medium opacity-90">Total Score</h2>
          <div className="text-5xl font-bold mt-2">{session.score || 0} <span className="text-2xl opacity-75">/ {session.totalMarks || 0}</span></div>
        </Card>
        
        <Card className="p-6 bg-white flex flex-col justify-center items-center text-center border-gray-100 shadow-sm">
          <Clock className="w-12 h-12 text-primary-400 mb-2" />
          <h2 className="text-xl font-medium text-gray-600">Time Spent</h2>
          <div className="text-4xl font-bold mt-2 text-gray-900">{formatTime(displayTotalTime)}</div>
        </Card>
      </div>

      <Card className="overflow-hidden mt-6">
        {subjects.length > 1 && (
          <div className="flex border-b overflow-x-auto">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub)}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${activeSubject === sub ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-8 bg-gray-50">
          {(subjectGroups[activeSubject] || questions).map((q) => {
            const userAnswer = session.answers?.find(a => a.questionId === q._id || a.questionId === q.questionId);
            const isAttempted = userAnswer && userAnswer.status !== 'NOT_ANSWERED';
            const isCorrect = userAnswer?.isCorrect;

            return (
              <div key={q._id || q.questionId} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded">Q {q.originalIndex + 1}</span>
                    <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Marks: {q.marks || 4} | -{q.negativeMarks || 1}</span>
                    {userAnswer && <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3"/> {formatTime(userAnswer.timeSpentSeconds || 0)}</span>}
                    {!isAttempted ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Skipped</span>
                    ) : isCorrect ? (
                      <span className="px-2 py-1 bg-success-100 text-success-700 text-xs rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Correct</span>
                    ) : (
                      <span className="px-2 py-1 bg-danger-100 text-danger-700 text-xs rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Incorrect</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pl-14">
                  {q.options?.map((opt) => {
                    const isSelected = userAnswer && userAnswer.selectedOptionId === opt._id;
                    const isActualCorrect = opt.isCorrect;
                    
                    let borderClass = 'border-gray-200';
                    let bgClass = 'bg-white';
                    let icon = null;

                    if (isActualCorrect) {
                      borderClass = 'border-success-500 ring-1 ring-success-500';
                      bgClass = 'bg-success-50';
                      icon = <CheckCircle className="w-5 h-5 text-success-500" />;
                    } else if (isSelected && !isActualCorrect) {
                      borderClass = 'border-danger-500';
                      bgClass = 'bg-danger-50';
                      icon = <XCircle className="w-5 h-5 text-danger-500" />;
                    }

                    return (
                      <div key={opt._id} className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass} ${bgClass}`}>
                        <div className="w-5 flex justify-center">{icon}</div>
                        <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-4 ml-14 p-4 bg-primary-50 rounded-lg border border-primary-100">
                    <div className="flex items-center gap-2 text-primary-700 font-semibold mb-2 text-sm">
                      <Award className="w-4 h-4 text-primary-500" /> Explanation & Solution
                    </div>
                    <div className="text-gray-700 text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: q.explanation }} />
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
