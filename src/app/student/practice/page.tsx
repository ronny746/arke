"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentPractice() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/dpp');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1a7a35] border-t-transparent" />
    </div>
  );
}

