import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { UserPlus } from 'lucide-react';
import { formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import api from '../../../api/axiosInstance.js';

export default function LeadPool() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPool = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads/pool');
      setLeads(res.data.data);
    } catch (error) {
      toast.error('Failed to load the lead pool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
  }, []);

  const handleClaim = async (leadId) => {
    try {
      await api.post(`/leads/${leadId}/claim`);
      toast.success('Lead claimed successfully!');
      fetchPool(); // Refresh pool
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim lead');
    }
  };

  const columns = [
    { header: 'Student Name', accessorKey: 'studentName' },
    { header: 'City', accessorKey: 'city' },
    { header: 'Class', accessorKey: 'studentClass' },
    { header: 'Inquiry For', accessorKey: 'inquiryFor' },
    { header: 'Added On', accessorKey: 'createdAt', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Action',
      key: 'actions',
      sortable: false,
      cell: (row) => (
        <Button 
          variant="outline" 
          size="sm" 
          icon={UserPlus} 
          onClick={() => handleClaim(row._id)}
        >
          Claim Lead
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Lead Pool"
        subtitle="Unassigned leads waiting to be claimed."
        breadcrumbs={['Home', 'Lead Pool']} 
      />

      <Card className="p-5">
        <DataTable 
          data={leads} 
          columns={columns} 
          isLoading={loading}
          searchable 
          searchPlaceholder="Search unassigned leads..." 
        />
      </Card>
    </div>
  );
}
