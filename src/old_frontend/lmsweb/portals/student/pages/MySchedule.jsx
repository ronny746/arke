import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function MySchedule() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [scheduleRes, subjectsRes] = await Promise.all([
          studentAPI.getMySchedule(),
          studentAPI.getSubjects()
        ]);
        
        setData(Array.isArray(scheduleRes.data?.data) ? scheduleRes.data.data : []);
        
        const subMap = {};
        if (Array.isArray(subjectsRes.data?.data)) {
          subjectsRes.data.data.forEach(sub => {
            subMap[sub._id || sub.id] = sub.name;
          });
        }
        setSubjectsMap(subMap);
      } catch (err) {
        toast.error('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { 
      header: 'Day', 
      accessorKey: 'dayOfWeek',
      cell: (r) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.dayOfWeek] || 'N/A'
    },
    { 
      header: 'Subject', 
      cell: (r) => {
        if (r.subjectId?.name) return r.subjectId.name;
        if (typeof r.subjectId === 'string' && subjectsMap[r.subjectId]) return subjectsMap[r.subjectId];
        return 'N/A';
      }
    },
    { 
      header: 'Teacher', 
      cell: (r) => r.teacherId ? `${r.teacherId.firstName || ''} ${r.teacherId.lastName || ''}`.trim() : 'N/A' 
    },
    { 
      header: 'Time', 
      cell: (r) => `${r.startTime} - ${r.endTime}` 
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="My Schedule" 
        subtitle="Your weekly timetable" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search classes..."
        />
      </Card>
    </div>
  );
}
