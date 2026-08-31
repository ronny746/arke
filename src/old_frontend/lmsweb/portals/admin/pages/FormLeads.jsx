import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Download } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function FormLeads() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const [formRes, leadsRes] = await Promise.all([
        adminAPI.getFormById(id),
        adminAPI.getFormSubmissions(id)
      ]);
      setForm(formRes.data?.data);
      setLeads(Array.isArray(leadsRes.data?.data) ? leadsRes.data.data : []);
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLeads();
  }, [id]);

  const handleStatusChange = async (submissionId, newStatus) => {
    try {
      await adminAPI.updateSubmissionStatus(submissionId, { status: newStatus });
      toast.success('Status updated');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const statusColors = {
    'NEW': 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    'IN_PROGRESS': 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    'CONVERTED': 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    'REJECTED': 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  };

  // Build columns dynamically based on form fields
  // We'll take the first 8 fields from the form to display in the table
  const dynamicColumns = form?.fields?.slice(0, 8).map(field => ({
    header: field.label,
    accessorFn: (row) => row.data?.find(d => d.fieldId === field.id)?.value || '-',
    cell: (r) => <span className="text-sm">{r.data?.find(d => d.fieldId === field.id)?.value || '-'}</span>
  })) || [];

  const columns = [
    {
      header: 'Submitted On',
      accessorKey: 'createdAt',
      cell: (r) => <span className="text-sm text-surface-600">{format(new Date(r.createdAt), 'MMM dd, yyyy HH:mm')}</span>
    },
    ...dynamicColumns,
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (r) => (
        <select 
          className={`text-xs font-semibold border-none rounded-full px-3 py-1 cursor-pointer focus:ring-0 ${statusColors[r.status]}`}
          value={r.status}
          onChange={(e) => handleStatusChange(r._id, e.target.value)}
        >
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CONVERTED">Converted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      )
    }
  ];

  const exportData = () => {
    toast.success('Exporting leads...');
    // Real export logic can go here
  };

  const filteredLeads = statusFilter === 'ALL' ? leads : leads.filter(l => l.status === statusFilter);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title={form ? `${form.title} - Leads` : 'Form Leads'}
        subtitle={`Manage inquiries and submissions`}
        breadcrumbs={['Home', 'Forms', 'Leads']}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={Download} onClick={exportData}>Export CSV</Button>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/forms')}>Back to Forms</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: leads.length, color: 'text-surface-800 dark:text-white' },
          { label: 'New', value: leads.filter(s => s.status === 'NEW').length, color: 'text-primary-600' },
          { label: 'Converted', value: leads.filter(s => s.status === 'CONVERTED').length, color: 'text-success-600' },
          { label: 'Rejected', value: leads.filter(s => s.status === 'REJECTED').length, color: 'text-danger-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <DataTable
          columns={columns}
          data={filteredLeads}
          loading={loading}
          searchPlaceholder="Search leads..."
          actions={
            <select 
              className="form-select text-sm py-1.5 px-3 w-40 rounded-lg border-surface-200 dark:border-surface-700" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          }
          emptyIcon={Users}
          emptyTitle="No leads found"
          emptyDescription="When someone submits the form, their data will appear here."
        />
      </Card>
    </div>
  );
}
