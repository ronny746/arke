import { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function LiveClasses() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchLiveClasses = async () => {
      try {
        const res = await studentAPI.getLiveClasses();
        setData(res.data?.data || []);
      } catch (err) {
        toast.error('Failed to load live classes');
      } finally {
        setLoading(false);
      }
    };
    fetchLiveClasses();
  }, []);

  const columns = [
    { 
      header: 'Topic / Schedule', 
      cell: (r) => {
        if (r.classScheduleId?.classId) {
          const cls = r.classScheduleId.classId;
          const sub = r.classScheduleId.subjectId;
          return `${cls.name} ${cls.section || ''} - ${sub?.name || 'Subject'}`;
        }
        return 'Extra Class';
      }
    },
    { 
      header: 'Teacher', 
      cell: (r) => r.teacherId ? `${r.teacherId.firstName || ''} ${r.teacherId.lastName || ''}` : 'N/A' 
    },
    { 
      header: 'Status', 
      cell: (r) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          r.status === 'ONGOING' ? 'bg-success/10 text-success' : 
          r.status === 'COMPLETED' ? 'bg-surface-200 text-surface-700 dark:bg-surface-800' : 
          'bg-warning/10 text-warning'
        }`}>
          {r.status}
        </span>
      )
    },
    {
      header: 'Join Link',
      cell: (r) => (
        r.status !== 'COMPLETED' ? (
          <a 
            href={r.meetingLink} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-primary hover:text-primary-600 hover:underline"
          >
            <Video className="w-4 h-4" />
            Join Now
          </a>
        ) : <span className="text-surface-400">Ended</span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Live Classes" 
        subtitle="Join your scheduled virtual sessions" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search classes..."
          emptyIcon={Video}
          emptyTitle="No live classes scheduled"
        />
      </Card>
    </div>
  );
}
