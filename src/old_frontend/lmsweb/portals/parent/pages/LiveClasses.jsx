import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { Video, Clock, Calendar } from 'lucide-react';
import { useAuthStore } from '../../../store/index.js';
import { format } from 'date-fns';

export default function ParentLiveClasses() {
  const [loading, setLoading] = useState(true);
  const [liveClasses, setLiveClasses] = useState([]);
  const [children, setChildren] = useState([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchLiveClasses = async () => {
      setLoading(true);
      try {
        const [res, dashRes] = await Promise.all([
          parentAPI.getLiveClasses(),
          parentAPI.getDashboard()
        ]);
        setLiveClasses(Array.isArray(res.data?.data) ? res.data.data : []);
        setChildren(dashRes.data?.data?.children || []);
      } catch (err) {
        toast.error('Failed to load child live classes');
      } finally {
        setLoading(false);
      }
    };
    fetchLiveClasses();
  }, []);

  const columns = [
    { 
      header: 'Subject & Topic', 
      cell: (r) => {
        const topic = r.classScheduleId?.subjectId?.name || 'Subject';
        const clsName = r.classScheduleId?.classId?.name || 'Class';
        
        let displayDate = 'No date available';
        if (r.createdAt) {
          displayDate = format(new Date(r.createdAt), 'dd MMM yyyy, hh:mm a');
        } else if (r.classScheduleId?.startTime) {
          displayDate = format(new Date(r.classScheduleId.startTime), 'dd MMM yyyy, hh:mm a');
        }

        return (
          <div>
            <p className="font-medium text-surface-900 dark:text-white">{topic}</p>
            <p className="text-xs text-surface-500">{clsName}</p>
            <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
              <Calendar size={12} /> {displayDate}
            </p>
          </div>
        );
      }
    },
    { 
      header: 'Teacher', 
      cell: (r) => r.teacherId ? `${r.teacherId.firstName} ${r.teacherId.lastName}` : 'N/A' 
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
      header: 'Attendance Status',
      cell: (r) => {
        const childrenEmails = children.map(c => c.email).filter(Boolean);
        const isCompleted = r.status === 'COMPLETED';
        
        if (!isCompleted) {
          return <span className="text-surface-400 text-sm">Waiting for class to end</span>;
        }

        // Find if any of the parent's children attended by matching emails or names
        const participant = r.participants?.find(p => {
          if (p.userEmail && childrenEmails.includes(p.userEmail)) return true;
          
          const pName = p.name?.toLowerCase().trim();
          if (!pName) return false;
          
          return children.some(c => {
             const cName = `${c.firstName} ${c.lastName}`.toLowerCase().trim();
             return pName === cName || pName.includes(c.firstName?.toLowerCase() || '');
          });
        });

        if (participant) {
          const durationMins = Math.round((participant.duration || 0) / 60);
          return (
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700 w-max">
                Joined
              </span>
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Clock size={12} /> {durationMins} mins
              </span>
            </div>
          );
        }

        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-danger-100 text-danger-700 w-max">
            Absent
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Children's Live Classes" 
        subtitle="Monitor live class attendance and duration" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={liveClasses}
          loading={loading}
          searchPlaceholder="Search classes..."
          emptyIcon={Video}
          emptyTitle="No Live Classes Found"
        />
      </Card>
    </div>
  );
}
