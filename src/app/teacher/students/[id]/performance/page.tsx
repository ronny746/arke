"use client";

import { PageHeader } from '@/components/layout/index.jsx';
import StudentPerformanceDashboard from '@/components/analytics/StudentPerformanceDashboard';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function TeacherStudentPerformancePage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const studentId = unwrappedParams.id;

  const handleExamClick = (examId, submissionId) => {
    // Navigate to teacher exam analysis
    router.push(`/teacher/exams/${examId}/results/${submissionId}/analysis`);
  };

  const handleDppClick = (sessionId) => {
    router.push(`/teacher/dpp/${sessionId}/analysis`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Performance"
        subtitle="Track student academic progress and view past test solutions"
        breadcrumbs={['Home', 'Students', 'Performance']}
        onBack={() => router.back()}
      />
      
      <StudentPerformanceDashboard 
        studentId={studentId} 
        onExamClick={handleExamClick} 
        onDppClick={handleDppClick}
      />
    </div>
  );
}
