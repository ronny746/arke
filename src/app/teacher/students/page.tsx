"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LineChart, 
  Users, 
  BookOpen, 
  BarChart3
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Card, Avatar } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/teacher';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import BatchCohortAnalysisView from '@/components/analytics/BatchCohortAnalysisView';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [viewMode, setViewMode] = useState<'directory' | 'analysis'>('analysis');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, classesRes, subjectsRes] = await Promise.all([
          teacherAPI.getStudents(),
          teacherAPI.getViewBatches(),
          teacherAPI.getSubjects().catch(() => ({ data: { data: [] } }))
        ]);
        
        const studentsData = studentsRes.data?.data || studentsRes.data?.users || studentsRes.data || [];
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        
        const classesData = classesRes.data?.data || classesRes.data || [];
        setClasses(Array.isArray(classesData) ? classesData : []);

        const subjectsData = subjectsRes.data?.data || subjectsRes.data || [];
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch {
        toast.error('Failed to load students and batches data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    return selectedBatchId === 'all' 
      ? students 
      : students.filter(student => {
          const cls = classes.find(c => c._id === selectedBatchId || c.id === selectedBatchId);
          if (!cls || !cls.students) return false;
          return cls.students.some(s => String(s._id || s.id || s) === String(student._id || student.id));
        });
  }, [selectedBatchId, students, classes]);

  const columns = [
    {
      header: 'Student',
      accessorKey: 'firstName',
      cell: (r: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-semibold text-surface-800 dark:text-white text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Roll No',
      accessorKey: 'rollNo',
      cell: (r: any) => <span className="text-xs font-bold text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded-md">{r.metadata?.rollNo || r.rollNo || '—'}</span>,
    },
    {
      header: 'Class / Batch',
      accessorKey: 'class',
      cell: (r: any) => {
        const studentBatches = classes.filter(cls => 
          cls.students?.some((s: any) => String(s._id || s.id || s) === String(r._id || r.id))
        );
        return (
          <div className="flex flex-wrap gap-1">
            {studentBatches.length > 0 ? (
              studentBatches.map(b => (
                <span key={b._id} className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {b.name} {b.section ? `(${b.section})` : ''}
                </span>
              ))
            ) : (
              <span className="text-xs text-surface-400">{r.metadata?.class || 'Unassigned'}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (r: any) => (
        <span className={`badge ${r.isActive !== false ? 'badge-success' : 'badge-surface'} text-xs`}>
          {r.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'actions',
      sortable: false,
      cell: (r: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={LineChart}
            onClick={() => {
              const queryParams = new URLSearchParams();
              if (selectedBatchId !== 'all') queryParams.set('batch', selectedBatchId);
              if (selectedSubject !== 'ALL') queryParams.set('subject', selectedSubject);
              const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
              router.push(`/teacher/students/${r._id || r.id}/performance${qs}`);
            }}
          >
            Analysis
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Performance & Directory"
        subtitle="Overall batch performance, exams evaluation list, and subject-wise academic tracking"
        breadcrumbs={['Home', 'Students']}
      />

      {/* Top View Toggle Bar */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('analysis')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              viewMode === 'analysis'
                ? "bg-[#1a7a35] text-white shadow-xs"
                : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200"
            )}
          >
            <BarChart3 size={15} /> Batch & Subject Analysis
          </button>
          <button
            onClick={() => setViewMode('directory')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              viewMode === 'directory'
                ? "bg-[#1a7a35] text-white shadow-xs"
                : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200"
            )}
          >
            <Users size={15} /> Student Directory Roster ({filteredStudents.length})
          </button>
        </div>

        {/* Batch Quick Selector when in Directory Mode */}
        {viewMode === 'directory' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap",
                selectedBatchId === 'all'
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200"
              )}
            >
              All Students
            </button>
            {classes.map(cls => (
              <button
                key={cls._id || cls.id}
                onClick={() => setSelectedBatchId(cls._id || cls.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap",
                  selectedBatchId === (cls._id || cls.id)
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200"
                )}
              >
                {cls.name} {cls.section ? `- ${cls.section}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cohort Analysis View */}
      {viewMode === 'analysis' && (
        <BatchCohortAnalysisView
          batchId={selectedBatchId}
          portal="teacher"
          batches={classes}
          onSelectBatch={setSelectedBatchId}
          initialSubject={selectedSubject}
        />
      )}

      {/* Directory Table View */}
      {viewMode === 'directory' && (
        <Card className="p-5">
          <DataTable
            data={filteredStudents}
            columns={columns}
            loading={loading}
            searchable
            searchPlaceholder="Search students..."
            emptyIcon={Users}
            emptyTitle={selectedBatchId === 'all' ? "No students found" : "No students in this batch"}
            emptyDescription={selectedBatchId === 'all' ? "No students are enrolled yet." : "There are no students assigned to the selected batch."}
          />
        </Card>
      )}
    </div>
  );
}
