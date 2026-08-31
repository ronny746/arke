"use client";

import { DashboardLayout, Sidebar, Topbar } from '@/components/layout/index.jsx';
import { Home, FileCheck, Video, LineChart, BookOpen, PenTool, LayoutList, MessageSquare, ShieldAlert, CreditCard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const [access, setAccess] = useState({
    liveClasses: true,
    studyMaterials: true,
    dpps: true,
    testSeries: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored) setUser(JSON.parse(stored));

    if (token) {
      fetch('/api/v1/batches/my-batches', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const newAccess = { liveClasses: false, studyMaterials: false, dpps: false, testSeries: false };
          for (const batch of data.data) {
            if (batch.courseId?.access) {
              if (batch.courseId.access.liveClasses) newAccess.liveClasses = true;
              if (batch.courseId.access.studyMaterials) newAccess.studyMaterials = true;
              if (batch.courseId.access.dpps) newAccess.dpps = true;
              if (batch.courseId.access.testSeries) newAccess.testSeries = true;
            }
          }
          // If no batches, they see nothing anyway, but let's default to false if they have batches but no access
          if (data.data.length > 0) {
            setAccess(newAccess);
          }
        }
      })
      .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('myTabId')) {
      sessionStorage.setItem('myTabId', Math.random().toString());
    }
    const myTabId = sessionStorage.getItem('myTabId');
    
    // Implement single-tab enforcement
    const bc = new BroadcastChannel('lms_student_session');
    
    bc.onmessage = (event) => {
      if (event.data === 'TAB_PING') {
        // Another tab just opened, tell it we are already here
        bc.postMessage('TAB_PONG');
      } else if (event.data === 'TAB_PONG') {
        // We just opened, and another tab responded. We should block this tab.
        setIsDuplicateTab(true);
      } else if (typeof event.data === 'string' && event.data.startsWith('FORCE_LOGOUT|')) {
        const sender = event.data.split('|')[1];
        if (sender !== myTabId) {
          // The other tab requested a force logout
          localStorage.clear();
          window.location.href = '/';
        }
      } else if (event.data === 'FORCE_LOGOUT') { // Fallback for old tabs
        localStorage.clear();
        window.location.href = '/';
      }
    };
    
    // Announce our presence to other tabs
    bc.postMessage('TAB_PING');
    
    return () => bc.close();
  }, []);

  if (isDuplicateTab) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-bold mb-4">Multiple Tabs Blocked</h1>
        <p className="text-xl text-gray-300 max-w-2xl mb-8">
          For security reasons, you can only have the LMS open in one tab at a time. 
          Please close this tab and return to your original session.
        </p>
        <button 
          onClick={() => {
            const bc = new BroadcastChannel('lms_student_session');
            bc.postMessage(`FORCE_LOGOUT|${sessionStorage.getItem('myTabId')}`); // Tell other tabs to logout
            setIsDuplicateTab(false); // Let this tab continue!
          }}
          className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
        >
          Use This Tab Instead
        </button>
      </div>
    );
  }

  if (pathname?.includes('/play')) {
    return <div className="min-h-screen bg-[#f5f6fa]">{children}</div>;
  }

  const navGroups = [
    {
      label: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', to: '/student/dashboard' },
        { icon: LineChart, label: 'My Performance', to: '/student/performance' },
        { icon: CreditCard, label: 'Transactions & Fees', to: '/student/transactions' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { icon: LayoutList, label: 'My Courses', to: '/student/batches' },
        { icon: BookOpen, label: 'Study Materials', to: '/student/study-materials' },
        { icon: Video, label: 'Live Classes', to: '/student/live-classes' },
        { icon: MessageSquare, label: 'Q&A / Doubts', to: '/student/doubts' },
        { icon: LayoutList, label: 'DPP (Practice)', to: '/student/dpp' },
        { icon: PenTool, label: 'Interactive Practice', to: '/student/practice' },
      ]
    },
    {
      label: 'Examinations',
      items: [
        { icon: FileCheck, label: 'Online Tests', to: '/student/exams' },
      ]
    }
  ];

  // Check if current route is restricted
  const isRestricted = (
    (pathname.includes('/student/study-materials') && !access.studyMaterials) ||
    (pathname.includes('/student/live-classes') && !access.liveClasses) ||
    ((pathname.includes('/student/dpp') || pathname.includes('/student/practice')) && !access.dpps) ||
    (pathname.includes('/student/exams') && !access.testSeries)
  );

  return (
    <DashboardLayout sidebar={
      <Sidebar
        title="SKD Xpress"
        subtitle="Student Portal"
        portalInitial="S"
        navGroups={navGroups}
        user={user}
      />
    }>
      <Topbar title="SKD Xpress | Student" user={user} />
      <main className="p-4 md:p-6 h-full">
        {isRestricted ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-lg mx-auto animate-fade-in">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-red-500/20 transform rotate-3">
              <BookOpen size={48} className="text-white transform -rotate-3" />
            </div>
            <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-4">
              Upgrade Your Plan
            </h2>
            <p className="text-surface-600 dark:text-surface-400 text-lg mb-8 leading-relaxed">
              You currently do not have access to this feature. Upgrade your course package to unlock premium study materials, live classes, and daily practice problems.
            </p>
            <button onClick={() => window.location.href = '/'} className="bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-500 hover:to-accent-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-accent-500/30 transition-all transform hover:-translate-y-1">
              View Available Courses
            </button>
          </div>
        ) : (
          children
        )}
      </main>
      <ProfileCompletionModal user={user} onComplete={setUser} />
    </DashboardLayout>
  );
}
