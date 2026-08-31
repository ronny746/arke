import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { BookOpen, Video, Award, Clock } from 'lucide-react';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const [data, setData] = useState({
    upcomingClasses: 0,
    pendingHomework: 0,
    attendance: 0,
    recentScores: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [liveRes, hwRes] = await Promise.all([
          studentAPI.getLiveClasses(),
          studentAPI.getHomework()
        ]);
        
        setData({
          upcomingClasses: liveRes.data?.data?.filter(c => c.status === 'SCHEDULED')?.length || 0,
          pendingHomework: hwRes.data?.data?.length || 0,
          attendance: 95, // mock for now
          recentScores: 88
        });
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Student Dashboard" 
        subtitle="Welcome back! Here's your academic overview." 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Classes" value={data.upcomingClasses} icon={Video} color="primary" />
        <StatCard title="Pending Homework" value={data.pendingHomework} icon={BookOpen} color="warning" />
        <StatCard title="Attendance" value={`${data.attendance}%`} icon={Clock} color="success" />
        <StatCard title="Recent Avg Score" value={`${data.recentScores}%`} icon={Award} color="info" />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Announcements</h3>
        <p className="text-surface-500">No new announcements at this time.</p>
      </Card>
    </div>
  );
}
