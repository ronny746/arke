import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { CreditCard, DollarSign } from 'lucide-react';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function Fees() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const res = await parentAPI.getFees();
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error('Failed to load fees details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handlePayment = async (record) => {
    setProcessingId(record._id || record.id);
    try {
      // Simulate Razorpay opening and processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await parentAPI.payFees({
        studentId: record.studentId?._id || record.studentId,
        amount: record.amountDue,
        paymentMethod: 'ONLINE',
        transactionId: `TXN_${Date.now()}`
      });
      
      toast.success('Payment completed successfully!');
      fetchFees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setProcessingId(null);
    }
  };

  const columns = [
    { 
      header: 'Child', 
      cell: (r) => r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName}` : 'N/A' 
    },
    { 
      header: 'Fee Type', 
      accessorKey: 'feeType' 
    },
    { 
      header: 'Total Amount', 
      cell: (r) => `$${r.totalAmount}` 
    },
    { 
      header: 'Due', 
      cell: (r) => `$${r.amountDue}` 
    },
    { 
      header: 'Status', 
      cell: (r) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          r.status === 'PAID' ? 'bg-success/10 text-success' : 
          r.status === 'PARTIAL' ? 'bg-warning/10 text-warning' : 
          'bg-danger/10 text-danger'
        }`}>
          {r.status}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (r) => (
        r.status !== 'PAID' ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePayment(r)}
            disabled={processingId === (r._id || r.id)}
            className="gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {processingId === (r._id || r.id) ? 'Processing...' : 'Pay Now'}
          </Button>
        ) : <span className="text-surface-400 font-medium">Fully Paid</span>
      )
    }
  ];

  const totalDue = data.reduce((acc, curr) => acc + (curr.amountDue || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Fees & Payments" 
          subtitle="View and pay your children's school fees" 
        />
        <div className="text-right">
          <p className="text-sm text-surface-500">Total Outstanding Due</p>
          <p className="text-3xl font-bold text-danger">${totalDue.toFixed(2)}</p>
        </div>
      </div>
      
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search fee records..."
          emptyIcon={DollarSign}
          emptyTitle="No fee records found"
        />
      </Card>
    </div>
  );
}
