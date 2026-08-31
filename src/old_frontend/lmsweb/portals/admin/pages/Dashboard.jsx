import { useState, useEffect } from 'react';
import { GraduationCap, Users } from 'lucide-react';
import { StatCard } from '../../../components/ui/index.jsx';
import { PageHeader } from '../../../components/layout/index.jsx';
import { axiosInstance } from '../../../api/index.js';
import { useAuthStore } from '../../../store/index.js';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get('/dashboard');
        setData(res.data?.overview || res.data?.data?.overview || res.data?.message?.overview || {});
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    { title: 'Total Students', value: data?.totalStudents || 0, icon: GraduationCap, color: 'primary' },
    { title: 'Total Teachers', value: data?.totalTeachers || 0, icon: Users, color: 'secondary' },
    { title: 'Active Classes Today', value: data?.activeClassesToday || 0, icon: GraduationCap, color: 'success' },
  ];

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${user?.instituteName || 'Sunrise Academy'} • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        breadcrumbs={['Home', 'Dashboard']}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
      </div>
    </div>
  );
}
