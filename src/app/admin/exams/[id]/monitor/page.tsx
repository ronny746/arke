"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { ArrowLeft, Users, AlertTriangle, Clock, RefreshCw, CameraOff, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function LiveMonitor() {
  const { id } = useParams();
  const router = useRouter();

  const getBackPath = () => {
    if (window.location.pathname.startsWith('/teacher')) return '/teacher/exams';
    if (window.location.pathname.startsWith('/super-admin')) return '/super-admin/exams';
    return '/admin/exams';
  };
  
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchMonitorData = async () => {
    try {
      const [examRes, monitorRes] = await Promise.all([
        adminAPI.getExamById(id),
        adminAPI.getLiveMonitoringData(id)
      ]);
      setExam(examRes.data.data.exam);
      setStudents(monitorRes.data.data);
      setLastRefreshed(new Date());
    } catch (error) {
      toast.error('Failed to fetch live monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMonitorData, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const activeCount = students.filter(s => s.status === 'IN_PROGRESS').length;
  const submittedCount = students.filter(s => s.status.includes('SUBMITTED')).length;
  const totalViolations = students.reduce((sum, s) => sum + (s.violations?.tabSwitches || 0) + (s.violations?.fullScreenExits || 0), 0);

  if (loading && !exam) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(getBackPath())} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Monitor: {exam?.title}</h1>
            <p className="text-sm text-gray-500 flex items-center">
               Last refreshed: {lastRefreshed.toLocaleTimeString()} 
               <RefreshCw className="w-3 h-3 ml-2 text-primary-500 animate-spin" />
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-primary-50 border-primary-100">
          <div className="p-3 bg-primary-100 rounded-full text-primary-600"><Users /></div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Active Students</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-success-50 border-success-100">
          <div className="p-3 bg-success-100 rounded-full text-success-600"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Submitted</p>
            <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 bg-error-50 border-error-100">
          <div className="p-3 bg-error-100 rounded-full text-error-600"><AlertTriangle /></div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Violations</p>
            <p className="text-2xl font-bold text-gray-900">{totalViolations}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((data, idx) => (
          <Card key={idx} className="overflow-hidden">
             {/* Snapshot Area */}
             <div className="h-48 bg-gray-900 relative flex items-center justify-center">
                {data.latestSnapshot ? (
                  <img src={data.latestSnapshot} alt="Proctoring Snapshot" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-500">
                    <CameraOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No Snapshot Available</p>
                  </div>
                )}
                
                {data.status === 'IN_PROGRESS' && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded flex items-center shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span> LIVE
                  </div>
                )}

                {data.status.includes('SUBMITTED') && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-success-500 text-white text-xs font-bold rounded shadow-lg">
                    SUBMITTED
                  </div>
                )}

                {data.lastSnapshotTime && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    {new Date(data.lastSnapshotTime).toLocaleTimeString()}
                  </div>
                )}
             </div>

             {/* Details Area */}
             <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 truncate">
                      {data.student?.firstName ? `${data.student.firstName} ${data.student.lastName}` : data.publicUser?.name ? data.publicUser.name : 'Unknown Student'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Roll: {data.student?.metadata?.rollNo || (data.publicUser ? 'Public User' : 'N/A')}
                    </p>
                  </div>
                  {data.score !== null && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Score</p>
                      <p className="font-bold text-primary-600">{data.score}</p>
                    </div>
                  )}
                </div>

                  {data.progress && data.status === 'IN_PROGRESS' && (
                    <>
                      <div className="flex justify-between text-sm mt-3 pt-3 border-t">
                        <span className="text-gray-600 font-medium">Attempted:</span>
                        <span className="font-semibold text-primary-600">
                          {data.progress.attempted} / {data.progress.totalQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Skipped:</span>
                        <span className="font-semibold text-gray-900">{data.progress.skipped}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Time Left:</span>
                        <span className="font-semibold text-error-600">
                          {Math.floor(data.progress.timeLeft / 60)}:{(data.progress.timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="space-y-1 mt-4 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tab Switches:</span>
                      <span className={`font-semibold ${data.violations?.tabSwitches > 0 ? 'text-error-600' : 'text-gray-900'}`}>
                        {data.violations?.tabSwitches || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fullscreen Exits:</span>
                      <span className={`font-semibold ${data.violations?.fullScreenExits > 0 ? 'text-error-600' : 'text-gray-900'}`}>
                        {data.violations?.fullScreenExits || 0}
                      </span>
                    </div>
                  </div>
             </div>
          </Card>
        ))}
      </div>

      {students.length === 0 && !loading && (
        <Card className="p-10 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No students have started this exam yet.</p>
        </Card>
      )}
    </div>
  );
}

