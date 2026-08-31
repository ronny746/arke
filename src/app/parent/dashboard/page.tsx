"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirecting to exams for now as per V1 scope
    router.push('/parent/exams');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
