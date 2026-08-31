"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function StudentExams() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.getExams();
      setExams(res.data.data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.settings.startTime);
    const endTime = new Date(exam.settings.endTime);

    if (exam.submissionStatus === 'SUBMITTED' || exam.submissionStatus === 'AUTO_SUBMITTED') {
      return <span className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-xs font-semibold flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1"/> Completed</span>;
    }
    
    if (exam.submissionStatus === 'IN_PROGRESS') {
      return <span className="px-3 py-1 bg-warning-100 text-warning-800 rounded-full text-xs font-semibold flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> In Progress</span>;
    }

    if (now < startTime) {
      return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> Upcoming</span>;
    }

    if (now > endTime) {
      return <span className="px-3 py-1 bg-error-100 text-error-800 rounded-full text-xs font-semibold flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1"/> Missed</span>;
    }

    return <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold flex items-center w-fit"><Play className="w-3 h-3 mr-1"/> Active Now</span>;
  };

  const isExamActive = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.settings.startTime);
    const endTime = new Date(exam.settings.endTime);
    return now >= startTime && now <= endTime;
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <PageHeader
        title="My Exams"
        subtitle="View and attempt your assigned online tests"
        breadcrumbs={['Home', 'Exams']}
      />

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : exams.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No Exams Scheduled</h3>
          <p className="text-gray-500 mt-2">You don't have any upcoming or active exams right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <Card key={exam._id} className="p-5 hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-gray-900 leading-tight">{exam.title}</h3>
                {getStatusBadge(exam)}
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 flex-grow">
                <div className="flex justify-between">
                  <span>Questions:</span>
                  <span className="font-semibold text-gray-900">{exam.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Marks:</span>
                  <span className="font-semibold text-gray-900">{exam.totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-semibold text-gray-900">{exam.settings.durationMinutes} mins</span>
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-gray-500">
                    Starts: {new Date(exam.settings.startTime).toLocaleString()}<br/>
                    Ends: {new Date(exam.settings.endTime).toLocaleString()}
                  </p>
                </div>
                
                {exam.score !== null && exam.score !== undefined && (
                   <div className="mt-4 p-3 bg-primary-50 rounded-lg flex justify-between items-center border border-primary-100">
                     <span className="font-medium text-primary-800">Your Score:</span>
                     <span className="text-xl font-bold text-primary-700">{exam.score} / {exam.totalMarks}</span>
                   </div>
                )}
              </div>

              <div className="mt-6">
                {(exam.submissionStatus === 'NOT_STARTED' || exam.submissionStatus === 'IN_PROGRESS') && isExamActive(exam) ? (
                  <Button 
                    variant="gradient" 
                    className="w-full" 
                    icon={Play}
                    onClick={() => router.push(`/student/exams/${exam._id}/play`)}
                  >
                    {exam.submissionStatus === 'IN_PROGRESS' ? 'Resume Exam' : 'Start Exam'}
                  </Button>
                ) : exam.submissionStatus === 'SUBMITTED' || exam.submissionStatus === 'AUTO_SUBMITTED' ? (
                  <Button 
                    variant="primary" 
                    className="w-full" 
                    icon={CheckCircle}
                    onClick={() => router.push(`/student/exams/${exam._id}/analysis`)}
                  >
                    View Analysis
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    {isExamActive(exam) ? 'Not Started' : 'Unavailable'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
