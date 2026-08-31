import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { BookOpen } from 'lucide-react';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Academics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const [assignments, homework, subs] = await Promise.all([
          parentAPI.getChildrenAssignments().catch(() => ({ data: { data: [] } })),
          parentAPI.getChildrenHomework().catch(() => ({ data: { data: [] } })),
          parentAPI.getChildrenSubmissions().catch(() => ({ data: { data: [] } }))
        ]);
        
        const combined = [
          ...(Array.isArray(assignments.data?.data) ? assignments.data.data.map(d => ({ ...d, taskType: 'Assignment' })) : []),
          ...(Array.isArray(homework.data?.data) ? homework.data.data.map(d => ({ ...d, taskType: 'Homework' })) : [])
        ];
        
        setData(combined);
        setSubmissions(Array.isArray(subs.data?.data) ? subs.data.data : []);
      } catch (err) {
        toast.error('Failed to load children academic tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const columns = [
    { header: 'Child', accessorKey: 'classId.name', cell: (r) => r.classId?.name || 'Class/Student' },
    { header: 'Type', accessorKey: 'taskType' },
    { header: 'Title', accessorKey: 'title' },
    { header: 'Subject', cell: (r) => r.subjectId?.name || 'N/A' },
    { header: 'Due Date', cell: (r) => r.dueDate ? format(new Date(r.dueDate), 'MMM dd, yyyy') : 'N/A' },
    { 
      header: 'Submission Status', 
      cell: (r) => {
        const rowId = String(r._id || r.id);
        const submission = submissions.find(s => String(s.assignmentId?._id || s.assignmentId) === rowId);
        
        if (submission) {
          if (submission.status === 'graded') {
            return (
              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-accent-100 text-accent-700`}>
                Graded ({submission.marksObtained}/{r.maxMarks || 100})
              </span>
            );
          }
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700`}>
              Submitted
            </span>
          );
        }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-700`}>
            Pending
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Children's Academics" 
        subtitle="Monitor homework and assignments" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search tasks..."
          emptyIcon={BookOpen}
          emptyTitle="No academic tasks found"
        />
      </Card>
    </div>
  );
}
