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
    const fetchExams = async () => {
      try {
        const res = await parentAPI.getChildrenExams();
        const data = res.data?.data || [];
        
        // Group by childId
        const grouped = {};
        const childrenMap = new Map();
        
        data.forEach(exam => {
          const cId = exam.childId;
          const cName = exam.childName || (exam.child?.firstName + ' ' + exam.child?.lastName);
          
          if (!grouped[cId]) grouped[cId] = [];
          grouped[cId].push(exam);
          
          if (!childrenMap.has(cId)) {
            childrenMap.set(cId, { id: cId, name: cName });
          }
        });
        
        setExamsByChild(grouped);
        const childrenArray = Array.from(childrenMap.values());
        setChildrenList(childrenArray);
        
        if (childrenArray.length > 0) {
          setActiveTab(childrenArray[0].id);
        }
      } catch (error) {
        toast.error('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-surface-200 dark:border-surface-800">
          {childrenList.map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveTab(child.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === child.id 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
              }`}
            >
              <Avatar name={child.name} size="xs" />
              {child.name}
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
