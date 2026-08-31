"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Card, Avatar } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/teacher';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, classesRes] = await Promise.all([
          teacherAPI.getStudents(),
          teacherAPI.getViewAcademicClasses()
        ]);
        
        const studentsData = studentsRes.data?.data || studentsRes.data?.users || studentsRes.data || [];
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        
        const classesData = classesRes.data?.data || classesRes.data || [];
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = selectedClassId === 'all' 
    ? students 
    : students.filter(student => {
        const cls = classes.find(c => c._id === selectedClassId || c.id === selectedClassId);
        if (!cls || !cls.students) return false;
        return cls.students.some(s => String(s._id || s.id || s) === String(student._id || student.id));
      });

  const columns = [
    {
      header: 'Student',
      accessorKey: 'firstName',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-surface-800 dark:text-white text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Roll No',
      accessorKey: 'rollNo',
      cell: (r) => <span className="text-sm font-medium text-surface-700">{r.rollNo || '—'}</span>,
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (r) => <span className="text-sm text-surface-500">{r.phone || '—'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (r) => (
        <span className={`badge ${r.isActive ? 'badge-success' : 'badge-surface'}`}>
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'actions',
      sortable: false,
      cell: (r) => (
        <Button
          variant="outline"
          size="sm"
          icon={LineChart}
          onClick={() => router.push(`/teacher/students/${r._id || r.id}/performance`)}
        >
          View Performance
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="View and track student performance by class"
        breadcrumbs={['Home', 'Students']}
      />

      {/* Class Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedClassId('all')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
            selectedClassId === 'all'
              ? "bg-primary text-white shadow-sm"
              : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
          )}
        >
          All Students
        </button>
        {classes.map(cls => (
          <button
            key={cls._id || cls.id}
            onClick={() => setSelectedClassId(cls._id || cls.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
              selectedClassId === (cls._id || cls.id)
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
            )}
          >
            {cls.name} {cls.section ? `- ${cls.section}` : ''}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <DataTable
          data={filteredStudents}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Search students..."
          emptyIcon={Users}
          emptyTitle={selectedClassId === 'all' ? "No students found" : "No students in this class"}
          emptyDescription={selectedClassId === 'all' ? "No students are enrolled yet." : "There are no students assigned to the selected class."}
        />
      </Card>
    </div>
  );
}
