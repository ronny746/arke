import { useState, useEffect } from 'react';
import { BookOpen, FileText, MessageSquare } from 'lucide-react';
import { StatCard } from '../../../components/ui/index.jsx';
import { PageHeader } from '../../../components/layout/index.jsx';
import { teacherAPI } from '../../../api/index.js';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await teacherAPI.getDashboard();
        setData(res.data?.overview || res.data?.data?.overview || res.data?.message?.overview || res.data || {});
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    { title: "Upcoming Classes", value: data?.upcomingClasses?.length || 0, icon: BookOpen, color: 'primary' },
    { title: 'Pending Assignments to Grade', value: data?.pendingAssignmentsToGrade || 0, icon: FileText, color: 'warning' },
    { title: 'Unread Messages', value: data?.unreadMessages || 0, icon: MessageSquare, color: 'success' },
  ];

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        breadcrumbs={['Home', 'Dashboard']}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
      </div>
    </div>
  );
}
