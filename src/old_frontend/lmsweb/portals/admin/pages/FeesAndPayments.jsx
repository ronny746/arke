import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/helpers.js';

export default function FeesAndPayments() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getFees();
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error('Failed to load fee records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const columns = [
    { header: 'Student Name', accessorKey: 'studentName' },
    { header: 'Amount', accessorKey: 'amount' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Date', accessorKey: 'date' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fees & Payments"
        subtitle="Manage student fee collections and pending dues"
        breadcrumbs={['Home', 'Fees & Payments']}
        actions={<Button variant="gradient" icon={Download}>Export Report</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Collected" value="₹0" icon={DollarSign} color="success" />
        <StatCard title="Pending Fees" value="₹0" icon={FileText} color="danger" />
        <StatCard title="Recent Transactions" value="0" icon={Filter} color="primary" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No transactions found"
          emptyDescription="Fee records will appear here once transactions are made."
          emptyIcon={DollarSign}
        />
      </Card>
    </div>
  );
}
