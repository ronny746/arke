"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import { Camera, AlertCircle, X, ChevronLeft, ChevronRight, LineChart, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers.js';

export default function ExamResults() {
  const { id } = useParams();
  const router = useRouter();

  const getBackPath = () => {
    if (window.location.pathname.startsWith('/teacher')) return '/teacher/exams';
    if (window.location.pathname.startsWith('/super-admin')) return '/super-admin/exams';
    return '/admin/exams';
  };
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [exam, setExam] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Snapshots Modal state
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  // Gallery state
  const [currentSnapshotIdx, setCurrentSnapshotIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, submissionsRes] = await Promise.all([
          adminAPI.getExamById(id),
          adminAPI.getExamSubmissions(id)
        ]);
        setExam(examRes.data?.data?.exam || examRes.data?.data);
        setSubmissions(submissionsRes.data?.data || []);
      } catch {
        toast.error('Failed to load exam results');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await adminAPI.exportExamSubmissions(id);
      const data = res.data?.data;
      if (!data || data.length === 0) {
        return toast.error("No data available to export");
      }

      const dynamicSubjects = new Set();
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!['studentName', 'rollNumber', 'email', 'status', 'score', 'totalCorrect', 'totalWrong', 'totalUnattempted', 'tabSwitches', 'fullScreenExits'].includes(key)) {
            dynamicSubjects.add(key);
          }
        });
      });
      
      const subjectHeaders = Array.from(dynamicSubjects);
      const headers = ['Student Name', 'Roll No', 'Email', 'Status', 'Total Score', 'Correct', 'Wrong', 'Unattempted', 'Tab Switches', 'Fullscreen Exits', ...subjectHeaders.map(h => `${h} Score`)];
      
      const csvRows = [headers.join(',')];

      data.forEach(row => {
        const rowValues = [
          `"${row.studentName || ''}"`,
          `"${row.rollNumber || '-'}"`,
          `"${row.email || 'N/A'}"`,
          `"${row.status || ''}"`,
          row.score || 0,
          row.totalCorrect || 0,
          row.totalWrong || 0,
          row.totalUnattempted || 0,
          row.tabSwitches || 0,
          row.fullScreenExits || 0
        ];
        
        subjectHeaders.forEach(subject => {
          rowValues.push(row[subject] || 0);
        });

        csvRows.push(rowValues.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Exam_Results_${exam?.title || 'Export'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Results exported successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to export results");
    } finally {
      setExporting(false);
    }
  };

  const openSnapshots = async (submission) => {
    setSelectedSubmission(submission);
    setSnapshotsOpen(true);
    setSnapshotsLoading(true);
    setCurrentSnapshotIdx(0);
    setSnapshots([]);
    try {
      const res = await adminAPI.getSubmissionSnapshots(submission._id);
      setSnapshots(res.data?.data || []);
    } catch {
      toast.error('Failed to load snapshots');
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const columns = [
    {
      header: 'Student Name',
      accessorKey: 'studentName',
      cell: (row) => {
        if (row.student) {
          return `${row.student.firstName} ${row.student.lastName}`;
        }
        if (row.publicUser) {
          return `${row.publicUser.name} (Public)`;
        }
        return 'Unknown';
      }
    },
    {
      header: 'Roll No',
      cell: (row) => row.student?.metadata?.rollNo || row.student?.rollNumber || '-'
    },
    {
      header: 'Email',
      cell: (row) => row.student?.email || row.publicUser?.email || 'N/A'
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <span className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full",
          row.status === 'SUBMITTED' ? "bg-success/10 text-success" :
          row.status === 'AUTO_SUBMITTED' ? "bg-primary/10 text-primary" :
          row.status === 'REJECTED' ? "bg-danger/10 text-danger" :
          "bg-warning/10 text-warning"
        )}>
          {row.status.replace('_', ' ')}
        </span>
      )
    },
    {
      header: 'Score',
      accessorKey: 'score',
      cell: (row) => (
        <span className="font-semibold">{row.score} / {exam?.totalMarks || 0}</span>
      )
    },
    {
      header: 'Violations',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <AlertCircle className={cn(
            "w-4 h-4",
            (row.violations?.tabSwitches > 0 || row.violations?.fullScreenExits > 0) ? "text-danger" : "text-success"
          )} />
          <span className="text-sm">
            Tabs: {row.violations?.tabSwitches || 0} | FullScreen: {row.violations?.fullScreenExits || 0}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openSnapshots(row)} icon={Camera}>
            Snapshots
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/students/${row.student?._id || row.student?.id || (typeof row.student === 'string' ? row.student : '')}/performance`)} icon={LineChart}>
            Overall
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push(`${window.location.pathname}/${row._id}/analysis`)} icon={AlertCircle}>
            Analysis
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={exam ? `${exam.title} Results` : 'Exam Results'}
        subtitle="View student performance and proctoring logs"
        breadcrumbs={['Home', 'Exams', 'Results']}
        onBack={() => router.push(getBackPath())}
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exporting || submissions.length === 0} icon={Download}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        }
      />

      <Card className="p-5">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            data={submissions}
            columns={columns}
            searchable
            emptyTitle="No submissions found"
            emptyDescription="Students haven't submitted this exam yet."
          />
        )}
      </Card>

      {/* Snapshots Modal */}
      {snapshotsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-surface-900 border-surface-800">
            <div className="flex items-center justify-between p-4 border-b border-surface-800">
              <h3 className="text-lg font-semibold text-white">
                Proctoring Snapshots
                {selectedSubmission && (
                  <span className="ml-2 text-sm font-normal text-surface-400">
                    - {selectedSubmission.student ? `${selectedSubmission.student.firstName} ${selectedSubmission.student.lastName}` : selectedSubmission.publicUser?.name}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setSnapshotsOpen(false)}
                className="p-1 text-surface-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-surface-950">
              {snapshotsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-surface-400">
                  <Camera className="w-12 h-12 mb-4 opacity-50" />
                  <p>No snapshots captured for this submission.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Image Viewer */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-surface-800">
                    <img 
                      src={snapshots[currentSnapshotIdx].snapshotUrl} 
                      alt="Proctoring Snapshot" 
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Navigation Arrows */}
                    <button 
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentSnapshotIdx(p => Math.max(0, p - 1))}
                      disabled={currentSnapshotIdx === 0}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentSnapshotIdx(p => Math.min(snapshots.length - 1, p + 1))}
                      disabled={currentSnapshotIdx === snapshots.length - 1}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <span className="px-3 py-1 bg-black/70 backdrop-blur text-white text-sm rounded-full">
                        {new Date(snapshots[currentSnapshotIdx].timestamp).toLocaleTimeString()} ({currentSnapshotIdx + 1} / {snapshots.length})
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {snapshots.map((snap, idx) => (
                      <button
                        key={snap._id}
                        onClick={() => setCurrentSnapshotIdx(idx)}
                        className={cn(
                          "relative aspect-video rounded overflow-hidden border-2 transition-all",
                          idx === currentSnapshotIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={snap.snapshotUrl} alt="thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white py-0.5 text-center">
                          {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
