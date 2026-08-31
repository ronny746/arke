import { useState, useEffect } from 'react';
import { Users, UserCheck, PhoneCall, Calendar } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { useAuthStore } from '../../../store/index.js';
import api from '../../../api/axiosInstance.js';

export default function StaffDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total: 0, new: 0, inProgress: 0, converted: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/leads/my-leads');
        const leads = res.data.data;
        setStats({
          total: leads.length,
          new: leads.filter(l => l.status === 'New').length,
          inProgress: leads.filter(l => l.status === 'In-Progress').length,
          converted: leads.filter(l => l.status === 'Converted').length,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={`Welcome back, ${user?.firstName}!`}
        subtitle={`Designation: ${user?.metadata?.designation || 'Staff Member'}`}
        breadcrumbs={['Home', 'Dashboard']} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Assigned Leads</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">New Leads (Pending)</p>
              <h3 className="text-2xl font-bold mt-1">{stats.new}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-xl text-warning">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">In Progress</p>
              <h3 className="text-2xl font-bold mt-1">{stats.inProgress}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl text-success">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Converted Leads</p>
              <h3 className="text-2xl font-bold mt-1">{stats.converted}</h3>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
