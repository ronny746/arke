import { useState, useEffect } from 'react';
import { FileText, Plus, Copy, Check, Users, Settings, Edit, Power, PowerOff } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

export default function Forms() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getForms();
      setForms(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCopyLink = (publicId) => {
    const url = `${window.location.origin}/f/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    toast.success('Public link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleStatus = async (form) => {
    try {
      await adminAPI.updateForm(form._id || form.id, { isActive: !form.isActive });
      toast.success(`Form marked as ${!form.isActive ? 'Active' : 'Inactive'}`);
      fetchForms();
    } catch (err) {
      toast.error('Failed to update form status');
    }
  };

  const columns = [
    { header: 'Title', accessorKey: 'title', cell: (r) => <span className="font-medium text-surface-900 dark:text-white">{r.title}</span> },
    { header: 'Created On', accessorKey: 'createdAt', cell: (r) => format(new Date(r.createdAt), 'MMM dd, yyyy') },
    { header: 'Status', accessorKey: 'isActive', cell: (r) => (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${r.isActive ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500' : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-400'}`}>
        {r.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleCopyLink(r.publicId)} title="Copy Public Link">
            {copiedId === r.publicId ? <Check size={16} className="text-success-600" /> : <Copy size={16} />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/forms/${r._id || r.id}/edit`)} title="Edit Form">
            <Edit size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/forms/${r._id || r.id}/leads`)} title="View Leads/Submissions">
            <Users size={16} /> Leads
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => toggleStatus(r)} 
            title={r.isActive ? "Deactivate Form" : "Activate Form"}
            className={r.isActive ? 'text-danger hover:bg-danger-50 hover:border-danger' : 'text-success hover:bg-success-50 hover:border-success'}
          >
            {r.isActive ? <PowerOff size={16} /> : <Power size={16} />}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Form Builder & Leads"
        subtitle="Create custom forms to capture admission inquiries and leads."
        breadcrumbs={['Home', 'Forms']}
        actions={
          <Button variant="gradient" icon={Plus} onClick={() => navigate('/admin/forms/builder')}>
            Create New Form
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Forms" value={forms.length} icon={FileText} color="primary" />
        <StatCard title="Active Forms" value={forms.filter(f => f.isActive).length} icon={Check} color="success" />
      </div>

      <Card className="p-5">
        <DataTable
          columns={columns}
          data={forms}
          loading={loading}
          searchPlaceholder="Search forms..."
          emptyIcon={FileText}
          emptyTitle="No forms created yet"
          emptyDescription="Click 'Create New Form' to start building."
        />
      </Card>
    </div>
  );
}
