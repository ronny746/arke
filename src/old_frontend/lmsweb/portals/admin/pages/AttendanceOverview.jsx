import { useState, useEffect } from 'react';
import { ClipboardCheck, Download, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function AttendanceOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAttendance();
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const columns = [
    { header: 'Class', accessorKey: 'class' },
    { header: 'Present', accessorKey: 'present' },
    { header: 'Absent', accessorKey: 'absent' },
    { header: 'Date', accessorKey: 'date' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Overview"
        subtitle="Monitor institute-wide attendance"
        breadcrumbs={['Home', 'Attendance']}
        actions={<Button variant="gradient" icon={Download}>Export Report</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Overall Attendance" value="0%" icon={ClipboardCheck} color="primary" />
        <StatCard title="Total Students Present" value="0" icon={Users} color="success" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No attendance records"
          emptyDescription="Attendance records will appear here once marked."
          emptyIcon={ClipboardCheck}
        />
      </Card>
    </div>
  );
}
