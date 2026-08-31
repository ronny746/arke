"use client";

import { useState, useEffect } from 'react';
import { FileCheck, Plus, FileText, Calendar, Edit, Link } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, StatCard } from '@/components/ui/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI as adminAPI } from '@/api/teacher';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';


import { RowActions } from '@/components/tables/DataTable.jsx';

export default function ExamsAndResults() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getExams();
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const columns = [
    { header: 'Exam Name', accessorKey: 'title' },
    { header: 'Schedule Status', accessorKey: 'scheduleStatus' },
    { header: 'Total Questions', accessorKey: 'totalQuestions' },
    { header: 'Total Marks', accessorKey: 'totalMarks' },
    {
      header: '',
      cell: (row) => {
        const actions = [
          {
            icon: Edit,
            label: 'Edit Exam',
            onClick: () => router.push(`/teacher/exams/${row._id}/edit`)
          },
          {
            icon: FileCheck,
            label: 'Live Monitor',
            onClick: () => router.push(`/teacher/exams/${row._id}/monitor`)
          },
          {
            icon: FileText,
            label: 'View Results',
            onClick: () => router.push(`/teacher/exams/${row._id}/results`)
          }
        ];

        if (row.examType === 'PUBLIC') {
          actions.push({
            icon: Link,
            label: 'Copy Public Link',
            onClick: () => {
              const url = `${window.location.origin}/e/${row._id}`;
              navigator.clipboard.writeText(url);
              toast.success('Public link copied to clipboard!');
            }
          });
        }

        return <RowActions actions={actions} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Exams & Results"
        subtitle="Manage examinations and publish results"
        breadcrumbs={['Home', 'Exams']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => router.push('/teacher/exams/create')}>Create Exam</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Upcoming Exams" value="0" icon={FileCheck} color="primary" />
        <StatCard title="Results Published" value="0" icon={FileText} color="success" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No exams found"
          emptyDescription="Create your first exam schedule."
          emptyIcon={FileCheck}
        />
      </Card>
    </div>
  );
}
