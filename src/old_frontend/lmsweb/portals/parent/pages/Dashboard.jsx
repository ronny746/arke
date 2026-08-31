import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { BookOpen, Calendar, CreditCard, Clock } from 'lucide-react';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    upcomingPTM: 0,
    pendingFees: 0,
    attendance: 0,
    pendingHomework: 0
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [hwRes, feesRes, ptmRes] = await Promise.all([
          parentAPI.getChildrenHomework().catch(() => ({ data: { data: [] } })),
          parentAPI.getFees().catch(() => ({ data: { data: [] } })),
          parentAPI.getPtmSlots().catch(() => ({ data: { data: [] } }))
        ]);
        
        setData({
          upcomingPTM: ptmRes.data?.data?.filter(s => s.isBooked)?.length || 0,
          pendingFees: feesRes.data?.data?.reduce((acc, curr) => acc + curr.amountDue, 0) || 0,
          attendance: 92, // Mock average
          pendingHomework: hwRes.data?.data?.length || 0
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
        title="Parent Dashboard" 
        subtitle="Overview of your children's academic status" 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming PTMs" value={data.upcomingPTM} icon={Calendar} color="primary" />
        <StatCard title="Pending Homework" value={data.pendingHomework} icon={BookOpen} color="warning" />
        <StatCard title="Avg Attendance" value={`${data.attendance}%`} icon={Clock} color="success" />
        <StatCard title="Pending Fees" value={`$${data.pendingFees}`} icon={CreditCard} color="danger" />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Updates</h3>
        <p className="text-surface-500">No new updates from the school at this time.</p>
      </Card>
    </div>
  );
}
