"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Card, Avatar, Badge } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { parentAPI } from '@/api/parent';
import toast from 'react-hot-toast';

export default function ParentExamsPage() {
  const router = useRouter();
  const [childrenList, setChildrenList] = useState([]);
  const [examsByChild, setExamsByChild] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExamsAndChildren = async () => {
      try {
        const token = localStorage.getItem('token');
        const [authRes, examsRes] = await Promise.all([
          fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${token}` } }),
          parentAPI.getChildrenExams()
        ]);
        
        const authData = await authRes.json();
        const childrenArray = authData.data?.childrenIds || [];
        setChildrenList(childrenArray);

        const examData = examsRes.data?.data || [];
        
        // Group by childId
        const grouped = {};
        childrenArray.forEach(child => {
          grouped[child._id] = [];
        });

        examData.forEach(exam => {
          const cId = exam.childId;
          if (grouped[cId]) {
            grouped[cId].push(exam);
          } else {
            grouped[cId] = [exam];
          }
        });
        
        setExamsByChild(grouped);
        
        if (childrenArray.length > 0) {
          setActiveTab(childrenArray[0]._id);
        } else if (examData.length > 0) {
          setActiveTab(examData[0].childId);
        }
      } catch (error) {
        toast.error('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExamsAndChildren();
  }, []);

  const columns = [
    {
      header: 'Exam',
      accessorKey: 'title',
      cell: (r) => (
        <span className="font-medium">{r.title || r.examTitle || r.exam?.title}</span>
      )
    },
    {
      header: 'Date',
      cell: (r) => {
        const date = r.settings?.startTime || r.exam?.scheduledDate || r.createdAt;
        return <span className="text-sm text-surface-500">{date ? new Date(date).toLocaleDateString() : 'N/A'}</span>;
      }
    },
    {
      header: 'Score',
      cell: (r) => (
        <span className="font-medium text-surface-800 dark:text-white">
          {r.score !== undefined && r.score !== null ? `${r.score} / ${r.totalMarks || r.exam?.totalMarks || 100}` : '—'}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'submissionStatus',
      cell: (r) => {
        const status = r.submissionStatus || r.status || 'NOT_STARTED';
        const isCompleted = status === 'COMPLETED' || status === 'GRADED' || status === 'evaluated';
        return (
          <Badge variant={isCompleted ? 'success' : status === 'IN_PROGRESS' ? 'warning' : 'neutral'} className="capitalize">
            {status.replace('_', ' ').toLowerCase()}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      width: '120px',
      cell: (row) => {
        const s = row.submissionStatus || row.status || '';
        const isCompleted = ['COMPLETED', 'GRADED', 'SUBMITTED', 'AUTO_SUBMITTED', 'evaluated', 'completed'].includes(s.toUpperCase());
        return (
          <Button 
            variant="outline" 
            size="sm" 
            icon={LineChart} 
            disabled={!isCompleted}
            onClick={() => router.push(`/parent/exams/${row.examId || row.exam?._id || row._id}/analysis/${row.childId || row.child?._id}`)}
          >
            View Analysis
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Children's Exams"
        subtitle="Track your children's performance and view detailed analysis"
        breadcrumbs={['Home', 'Exams']}
      />

      {childrenList.length > 0 && (
        <div className="flex border-b border-surface-200 dark:border-surface-700 overflow-x-auto no-scrollbar">
            {childrenList.map(child => (
              <button
                key={child._id}
                onClick={() => setActiveTab(child._id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === child._id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50'
                }`}
              >
                <Avatar src={child.profilePictureUrl} fallback={child.firstName?.charAt(0) || '?'} size="sm" />
                {child.firstName} {child.lastName}
              </button>
            ))}
          </div>
      )}

      <Card className="p-5">
        <DataTable
          data={activeTab ? (examsByChild[activeTab] || []) : []}
          columns={columns}
          loading={loading}
          searchable
          emptyIcon={BookOpen}
          emptyTitle={childrenList.length === 0 ? "No children found" : "No exams found for this child"}
        />
      </Card>
    </div>
  );
}
