"use client";

import { PageHeader } from '@/components/layout/index.jsx';
import StudentPerformanceDashboard from '@/components/analytics/StudentPerformanceDashboard';
import { useRouter } from 'next/navigation';

export default function StudentPerformancePage() {
  const router = useRouter();

  const handleExamClick = (examId, submissionId) => {
    // Navigate to exam analysis
    router.push(`/student/exams/${examId}/analysis`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance & Results"
        subtitle="Track your academic progress and view past test solutions"
        breadcrumbs={['Home', 'Performance']}
      />
      
      <StudentPerformanceDashboard 
        studentId="me" 
        onExamClick={handleExamClick} 
      />
    </div>
  );
}
