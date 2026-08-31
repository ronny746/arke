import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ParentExamAnalysis() {
  const { id, childId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSubject, setActiveSubject] = useState('');

  useEffect(() => {
    fetchAnalysis();
  }, [id, childId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await parentAPI.getChildExamAnalysis(id, childId);
      setData(res.data.data);
      // Optional: Since backend returns detailedAnalysis, we could group by subject if we want to,
      // but for simplicity we will just show them all under "General" or activeSubject logic
    } catch (error) {
      toast.error('Failed to load exam analysis');
      navigate('/parent/exams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!data) return null;

  const { details, score, totalTime, submittedAt } = data;

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/parent/exams')}>Back to Exams</Button>
      </div>

      <PageHeader
        title="Exam Analysis"
        subtitle="Detailed breakdown of your child's performance"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white col-span-1 md:col-span-3 flex flex-col justify-center items-center text-center">
          <Award className="w-16 h-16 opacity-80 mb-2" />
          <h2 className="text-xl font-medium opacity-90">Total Score</h2>
          <div className="text-5xl font-bold mt-2 text-white">{score} <span className="text-2xl opacity-75">Marks</span></div>
          <p className="mt-4 opacity-80 text-sm">
            Submitted On: {new Date(submittedAt).toLocaleString()}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden mt-6">
        <div className="p-6 space-y-8 bg-gray-50">
          {details.map((q, index) => {
            const isAttempted = q.userAnswer && q.userAnswer.status !== 'NOT_ANSWERED';
            const isCorrect = q.isCorrect;

            return (
              <div key={q.questionId} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded">Q {index + 1}</span>
                    <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Marks: {q.marks}</span>
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
