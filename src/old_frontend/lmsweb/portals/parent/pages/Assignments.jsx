import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BookOpen } from 'lucide-react';
import { useAuthStore } from '../../../store/index.js';

export default function ParentAssignments() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignRes, subRes] = await Promise.all([
          parentAPI.getChildrenAssignments(),
          parentAPI.getChildrenSubmissions()
        ]);
        
        setAssignments(Array.isArray(assignRes.data?.data) ? assignRes.data.data : []);
        setSubmissions(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
      } catch (err) {
        toast.error('Failed to load child assignments');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: 'Title', accessorKey: 'title' },
    { 
      header: 'Subject & Class', 
      cell: (r) => (
        <div>
          <p className="font-medium text-surface-900 dark:text-white">{r.subjectId?.name || 'Subject'}</p>
          <p className="text-xs text-surface-500">{r.classId?.name || 'Class'}</p>
        </div>
      )
    },
    { 
      header: 'Due Date', 
      cell: (r) => r.dueDate ? format(new Date(r.dueDate), 'MMM dd, yyyy') : 'N/A'
    },
    { 
      header: 'Status', 
      cell: (r) => {
        const rowId = String(r._id || r.id);
        const submission = submissions.find(s => String(s.assignmentId?._id || s.assignmentId) === rowId);
        
        if (submission) {
          if (submission.status === 'graded') {
            return (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-accent-100 text-accent-700`}>
                Graded
              </span>
            );
          }
          return (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700`}>
              Submitted
            </span>
          );
        }
        
        const isPastDue = new Date(r.dueDate) < new Date();
        if (isPastDue) {
          return (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-danger-100 text-danger-700`}>
              Missing
            </span>
          );
        }
        return (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-700`}>
            Pending
          </span>
        );
      }
    },
    {
      header: 'Marks',
      cell: (r) => {
        const rowId = String(r._id || r.id);
        const submission = submissions.find(s => String(s.assignmentId?._id || s.assignmentId) === rowId);
        
        if (submission && submission.status === 'graded') {
          return <span className="font-semibold text-accent-600">{submission.marksObtained} / {r.maxMarks}</span>;
        }
        return <span className="text-surface-400">Not Graded</span>;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Children's Assignments" 
        subtitle="Monitor homework and assignment grades" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          searchPlaceholder="Search assignments..."
          emptyIcon={BookOpen}
          emptyTitle="No Assignments Found"
        />
      </Card>
    </div>
  );
}
