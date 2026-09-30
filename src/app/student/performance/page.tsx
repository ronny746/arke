"use client";

import { PageHeader } from '@/components/layout/index.jsx';
import StudentPerformanceDashboard from '@/components/analytics/StudentPerformanceDashboard';
import { TopicFlagsPanel } from '@/components/analytics/TopicFlagsPanel';
import { useRouter } from 'next/navigation';

export default function StudentPerformancePage() {
  const router = useRouter();

  const handleExamClick = (examId) => {
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
        onDppClick={() => router.push('/student/dpp')}
      />
      <section className="space-y-3">
        <div><h2 className="font-display text-xl font-semibold">Topic health</h2><p className="text-sm text-surface-500">Every topic is marked after a submitted test. Red topics include a remedial DPP when questions are available.</p></div>
        <TopicFlagsPanel />
      </section>
    </div>
  );
}
