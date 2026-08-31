import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ExamAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      navigate('/student/exams');
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
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/student/exams')}>Back to Exams</Button>
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
          {detailedQuestions.filter(q => (q.subject || 'General') === activeSubject).map((q, index) => {
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
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
