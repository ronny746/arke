"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function ExamAnalysis() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSubject, setActiveSubject] = useState('');

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.getExamAnalysis(id);
      setData(res.data.data);
      if (Object.keys(res.data.data.subjectStats).length > 0) {
        setActiveSubject(Object.keys(res.data.data.subjectStats)[0]);
      }
    } catch (error) {
      toast.error('Failed to load exam analysis');
      router.push('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!data) return null;

  const { submission, subjectStats, detailedQuestions, totalMarks, score } = data;
  const subjects = Object.keys(subjectStats);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => router.push('/student/exams')}>Back to Exams</Button>
      </div>

      <PageHeader
        title="Exam Analysis"
        subtitle="Detailed breakdown of your performance"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white col-span-1 md:col-span-3 lg:col-span-1 flex flex-col justify-center items-center text-center">
          <Award className="w-16 h-16 opacity-80 mb-2" />
          <h2 className="text-xl font-medium opacity-90">Total Score</h2>
          <div className="text-5xl font-bold mt-2">{score} <span className="text-2xl opacity-75">/ {totalMarks}</span></div>
          <p className="mt-4 opacity-80 text-sm">
            Status: {submission.status.replace('_', ' ')}
          </p>
        </Card>

        <Card className="p-6 col-span-1 md:col-span-3 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Subject-wise Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {subjects.map(sub => (
              <div key={sub} className="p-4 border rounded-xl bg-gray-50">
                <div className="font-bold text-gray-900">{sub}</div>
                <div className="text-sm text-gray-500 mt-1">Score: <span className="font-semibold text-primary-600">{subjectStats[sub].score}</span> / {subjectStats[sub].totalMarks}</div>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="text-success-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {subjectStats[sub].correct}</span>
                  <span className="text-error-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> {subjectStats[sub].wrong}</span>
                  <span className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {subjectStats[sub].totalQuestions - subjectStats[sub].attempted}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Difficulty & Topic Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Difficulty Analysis Card */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Difficulty-wise Performance</h3>
          <div className="space-y-4">
            {['Easy', 'Medium', 'Hard'].map((diff) => {
              const stats = data.difficultyStats?.[diff] || { totalQuestions: 0, correct: 0, wrong: 0, attempted: 0, accuracy: 0 };
              const colorClass = diff === 'Easy' ? 'bg-success-500' : diff === 'Medium' ? 'bg-amber-500' : 'bg-rose-500';
              const textClass = diff === 'Easy' ? 'text-success-600' : diff === 'Medium' ? 'text-amber-600' : 'text-rose-600';
              const bgLight = diff === 'Easy' ? 'bg-success-50' : diff === 'Medium' ? 'bg-amber-50' : 'bg-rose-50';

              return (
                <div key={diff} className={`p-4 border rounded-xl ${bgLight} border-opacity-40`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-900">{diff} Level</span>
                    <span className={`text-sm font-bold ${textClass}`}>{stats.accuracy}% Accuracy</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                    <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${stats.accuracy}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
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
          <h3 className="text-lg font-bold mb-4">Topic-wise Performance</h3>
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {Object.keys(data.topicStats || {}).length === 0 ? (
              <p className="text-sm text-gray-500">No topic data available</p>
            ) : (
              Object.keys(data.topicStats || {}).map((topic) => {
                const stats = data.topicStats[topic];
                const status = stats.status; // 'Strong' | 'Medium' | 'Weak'
                const badgeColor = 
                  status === 'Strong' ? 'bg-success-100 text-success-800 border-success-200' :
                  status === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-rose-100 text-rose-800 border-rose-200';

                return (
                  <div key={topic} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{topic}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Score: <span className="font-semibold text-primary-600">{stats.score}</span> / {stats.totalMarks} M &middot; Accuracy: {stats.accuracy}%
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${badgeColor}`}>
                      {status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden mt-6">
        <div className="flex border-b overflow-x-auto">
          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${activeSubject === sub ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {sub} ({subjectStats[sub].score} M)
            </button>
          ))}
        </div>

        <div className="p-6 space-y-8 bg-gray-50">
          {detailedQuestions.filter(q => {
            const subjectName = (q.subject && typeof q.subject === 'object') ? q.subject.name : (q.subject || 'General');
            return subjectName === activeSubject;
          }).map((q, index) => {
            const isAttempted = q.userAnswer && q.userAnswer.status !== 'NOT_ANSWERED';
            const isCorrect = q.isCorrect;

            return (
              <div key={q._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded">Q {index + 1}</span>
                    <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Marks: {q.marks} | -{q.negativeMarks}</span>
                    {!isAttempted ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Skipped</span>
                    ) : isCorrect ? (
                      <span className="px-2 py-1 bg-success-100 text-success-700 text-xs rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Correct (+{q.marksObtained})</span>
                    ) : (
                      <span className="px-2 py-1 bg-danger-100 text-danger-700 text-xs rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Incorrect ({q.marksObtained})</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pl-12">
                  {q.options.map((opt) => {
                    const isSelected = q.userAnswer && (q.userAnswer.selectedOptionId === opt._id || q.userAnswer.selectedOptionId === opt.id);
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
                  <div className="mt-4 ml-12 p-4 bg-primary-50 rounded-lg border border-primary-100">
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
