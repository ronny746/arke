"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Award, PlayCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [generatingDPP, setGeneratingDPP] = useState(false);
  const [remedialDpps, setRemedialDpps] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const handleGenerateDPP = async (parentSessionId = null, customWeakTopics = null) => {
    try {
      setGeneratingDPP(true);
      
      let weakTopics = [];
      if (customWeakTopics && customWeakTopics.length > 0) {
        weakTopics = customWeakTopics;
      } else if (data?.nestedStats) {
        Object.keys(data.nestedStats).forEach(subject => {
          Object.keys(data.nestedStats[subject]).forEach(topic => {
            const topicAcc = data.topicStats[topic]?.accuracy || 0;
            const isWeak = topicAcc < 50 || data.topicStats[topic]?.status === 'Weak';
            if (isWeak) {
              weakTopics.push({ subject, topic });
            }
          });
        });
      }

      if (weakTopics.length === 0) {
        toast.error("No weak topics found to generate DPP. Great job!");
        setGeneratingDPP(false);
        return;
      }

      // Ensure parentSessionId is only a string/ObjectId, not an event object
      const safeParentSessionId = typeof parentSessionId === 'string' ? parentSessionId : null;

      const targetQuestions = weakTopics.length === 1 ? 5 : Math.max(30, weakTopics.length * 2);

      const res = await studentAPI.generatePracticeSession({
        sessionType: 'DPP',
        subjectTopicPairs: weakTopics,
        numberOfQuestions: targetQuestions,
        linkedExamId: id,
        parentSessionId: safeParentSessionId
      });
      
      if (res.data?.success) {
        toast.success("DPP Generated Successfully!");
        router.push(`/student/practice/${res.data.data._id}/play`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate DPP");
      setGeneratingDPP(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const [analysisRes, dppsRes] = await Promise.all([
        studentAPI.getExamAnalysis(id),
        studentAPI.getRemedialDpps(id).catch(() => ({ data: { data: [] } }))
      ]);
      
      setData(analysisRes.data.data);
      setRemedialDpps(dppsRes.data.data || []);
      
      if (Object.keys(analysisRes.data.data.subjectStats).length > 0) {
        setActiveSubject(Object.keys(analysisRes.data.data.subjectStats)[0]);
      }
      if (analysisRes.data.data.nestedStats && Object.keys(analysisRes.data.data.nestedStats).length > 0) {
        setExpandedSubject(Object.keys(analysisRes.data.data.nestedStats)[0]);
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

  const { submission, subjectStats, detailedQuestions, totalMarks, score, nestedStats } = data;
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

      <div className="space-y-6">
        <Card className="p-6 md:p-8 bg-gradient-to-r from-primary-600 to-primary-800 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-full shadow-inner">
              <Award className="w-12 h-12 opacity-100 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-white mb-1">Total Score</h2>
              <p className="opacity-90 text-sm bg-white/20 px-3 py-1 rounded-full inline-block">
                Status: <span className="font-semibold">{submission.status.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
          <div className="mt-6 md:mt-0 flex items-baseline gap-2 bg-black/20 px-8 py-4 rounded-2xl shadow-inner backdrop-blur-sm">
            <span className="text-6xl font-bold">{score}</span>
            <span className="text-2xl font-medium opacity-75">/ {totalMarks}</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b pb-4 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Comprehensive Performance Breakdown</h3>
              <p className="text-sm text-gray-500 mt-1">Detailed analysis by Subject, Topic, and Difficulty Level. Note: 'Weak' means accuracy &lt; 50%.</p>
            </div>
            {remedialDpps.length === 0 && (
              <Button 
                size="sm" 
                onClick={() => handleGenerateDPP()} 
                disabled={generatingDPP}
                className="bg-primary-600 hover:bg-primary-700 text-white shadow-md whitespace-nowrap"
              >
                {generatingDPP ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Generate DPP for Weak Topics
              </Button>
            )}
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
            {nestedStats && Object.keys(nestedStats).length > 0 ? (
              Object.keys(nestedStats).map(subject => {
                const isExpanded = expandedSubject === subject;
                return (
                <div key={subject} className={`bg-white rounded-xl border transition-all duration-300 shadow-sm ${isExpanded ? 'border-primary-200 ring-1 ring-primary-100' : 'border-gray-200 hover:border-primary-300'}`}>
                  <div 
                    className={`flex justify-between items-center p-5 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/50 rounded-t-xl' : 'rounded-xl'}`}
                    onClick={() => setExpandedSubject(isExpanded ? null : subject)}
                  >
                    <h4 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full transition-colors ${isExpanded ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                      {subject}
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 px-4 py-1.5 rounded-full shadow-sm">
                        Overall Score: <span className={subjectStats[subject]?.score < 0 ? 'text-rose-600' : 'text-primary-600'}>{subjectStats[subject]?.score}</span> / {subjectStats[subject]?.totalMarks}
                      </div>
                      <div className="text-gray-400 bg-gray-50 p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 bg-white rounded-b-xl space-y-4">
                    {Object.keys(nestedStats[subject]).map(topic => {
                      const topicAcc = data.topicStats[topic]?.accuracy || 0;
                      const isWeak = topicAcc < 50 || data.topicStats[topic]?.status === 'Weak';
                      
                      return (
                        <div key={topic} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                            <h5 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                              {topic}
                              {isWeak && <span className="text-[10px] uppercase font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Weak</span>}
                            </h5>
                            <span className="text-sm font-bold text-gray-600">Accuracy: <span className={isWeak ? 'text-rose-600' : 'text-success-600'}>{topicAcc}%</span></span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['Easy', 'Medium', 'Hard'].map(diff => {
                              const stats = nestedStats[subject][topic][diff] || {
                                accuracy: 0,
                                totalQuestions: 0
                              };
                              
                              // Calculate exact stats from detailedQuestions
                              const qs = detailedQuestions.filter(q => {
                                const qSubj = (q.subject && typeof q.subject === 'object') ? q.subject.name : (q.subject || 'General');
                                const qTopic = (q.topic && typeof q.topic === 'object') ? q.topic.name : (q.topic || 'General');
                                const qDiff = q.difficulty || 'Medium';
                                return qSubj === subject && qTopic === topic && qDiff === diff;
                              });

                              let correct = 0;
                              let wrong = 0;
                              let skipped = 0; // visited but not answered
                              let unvisited = 0; // not visited

                              qs.forEach(q => {
                                const ans = q.userAnswer;
                                if (!ans) {
                                  unvisited++;
                                } else if (ans.status === 'NOT_ANSWERED') {
                                  skipped++;
                                } else {
                                  if (q.isCorrect) correct++;
                                  else wrong++;
                                }
                              });
                              
                              const totalQs = qs.length;
                              const colorClass = diff === 'Easy' ? 'bg-success-500 text-success-600' : diff === 'Medium' ? 'bg-amber-500 text-amber-600' : 'bg-rose-500 text-rose-600';
                              
                              return (
                                <div key={diff} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
                                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                    <span className={`font-bold ${colorClass.split(' ')[1]}`}>{diff} Level</span>
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{totalQs} Questions</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs font-medium mb-3">
                                    <div className="flex justify-between p-2 rounded bg-success-50 text-success-700">
                                      <span>Correct:</span> <span>{correct}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-rose-50 text-rose-700">
                                      <span>Wrong:</span> <span>{wrong}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-amber-50 text-amber-700">
                                      <span title="Visited but not answered">Skipped:</span> <span>{skipped}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-gray-100 text-gray-600">
                                      <span title="Not visited">Unvisited:</span> <span>{unvisited}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })
            ) : (
              <p className="text-gray-500">No detailed analysis available</p>
            )}
          </div>
        </Card>
      </div>

      {remedialDpps.length > 0 && (
        <Card className="p-6 mt-6 border-primary-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-6">
            <PlayCircle className="w-6 h-6 text-primary-600" />
            <h3 className="text-xl font-bold text-gray-800">Adaptive Remedial Track</h3>
          </div>
          <div className="space-y-4">
            {remedialDpps.map((dpp, index) => {
              // Calculate weak topics for this specific DPP if completed
              let dppWeakTopics = [];
              if (dpp.status === 'COMPLETED') {
                const topicStats = {};
                // Look at all questions in the DPP. If not answered correctly, it counts as wrong.
                dpp.questions?.forEach(q => {
                  const ans = dpp.answers?.find(a => a.questionId === q.questionId || a.questionId === (q.question && q.question._id) || a.questionId === q._id);
                  const isCorrect = ans ? ans.isCorrect : false;
                  
                  const qObj = q.question || q;
                  const subject = qObj.subject?.name || qObj.subjectName || (typeof qObj.subject === 'string' ? qObj.subject : 'Unknown');
                  const topic = qObj.topic?.name || qObj.topicName || (typeof qObj.topic === 'string' ? qObj.topic : 'Unknown');
                  
                  if (subject === 'Unknown' || topic === 'Unknown') return; // Skip if we can't identify

                  const key = `${subject}||${topic}`;
                  
                  if (!topicStats[key]) topicStats[key] = { subject, topic, correct: 0, total: 0 };
                  topicStats[key].total++;
                  if (isCorrect) topicStats[key].correct++;
                });
                
                Object.keys(topicStats).forEach(key => {
                  const acc = (topicStats[key].correct / topicStats[key].total) * 100;
                  if (acc < 50) dppWeakTopics.push({ subject: topicStats[key].subject, topic: topicStats[key].topic });
                });
              }

              const isLatestLevel = index === remedialDpps.length - 1;

              return (
                <div key={dpp._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary-100 text-primary-700 font-bold px-2 py-1 rounded text-xs">Level {index + 1}</span>
                      <h4 className="font-bold text-gray-800">{dpp.title}</h4>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Status: <span className={`font-semibold ${dpp.status === 'COMPLETED' ? 'text-success-600' : 'text-amber-600'}`}>{dpp.status.replace('_', ' ')}</span>
                      {dpp.status === 'COMPLETED' && ` • Score: ${dpp.score} / ${dpp.totalMarks}`}
                    </div>
                    {dpp.status === 'COMPLETED' && dppWeakTopics.length > 0 && (
                      <div className="mt-2 text-sm text-danger-600 font-medium">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Still weak in: {dppWeakTopics.map(t => t.topic).join(', ')}
                      </div>
                    )}
                    {dpp.status === 'COMPLETED' && dppWeakTopics.length === 0 && dpp.score > 0 && (
                      <div className="mt-2 text-sm text-success-600 font-medium">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Mastered all topics in this session!
                      </div>
                    )}
                    {dpp.status === 'COMPLETED' && dppWeakTopics.length === 0 && dpp.score === 0 && (
                      <div className="mt-2 text-sm text-amber-600 font-medium">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Score is 0. Attempt more questions to improve.
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    {dpp.status === 'COMPLETED' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/student/practice/${dpp._id}/play`)}>Review</Button>
                        {dppWeakTopics.length > 0 && isLatestLevel && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            disabled={generatingDPP}
                            onClick={() => handleGenerateDPP(dpp._id, dppWeakTopics)}
                          >
                            Generate Level {index + 2} DPP
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => router.push(`/student/practice/${dpp._id}/play`)}>Resume</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
