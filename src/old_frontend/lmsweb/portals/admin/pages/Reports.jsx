import { useState, useEffect } from 'react';
import { Download, FileText, Plus, RefreshCw, BarChart2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { cn, formatDate } from '../../../utils/helpers.js';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

const statusColors = {
  PENDING: 'badge-warning',
  PROCESSING: 'badge-primary',
  COMPLETED: 'badge-success',
  FAILED: 'badge-danger',
};

export default function Reports() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [reportType, setReportType] = useState('ATTENDANCE_MONTHLY');
  const [generating, setGenerating] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getReportTasks();
      setTasks(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await adminAPI.queueReportGeneration({
        reportType,
        criteria: {}
      });
      toast.success('Report generation queued!');
      setShowGenerate(false);
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed to queue report');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { header: 'Report Type', accessorKey: 'reportType', cell: (r) => <span className="font-medium text-sm text-surface-800 dark:text-white capitalize">{r.reportType?.replace('_', ' ')}</span> },
    { header: 'Status', accessorKey: 'status', cell: (r) => <span className={cn('badge text-xs', statusColors[r.status] || 'badge-surface')}>{r.status}</span> },
    { header: 'Requested At', accessorKey: 'createdAt', cell: (r) => <span className="text-sm text-surface-500">{formatDate(r.createdAt)}</span> },
    { 
      header: 'Download', 
      key: 'actions',
      sortable: false,
      cell: (r) => r.status === 'COMPLETED' ? (
        <a href={r.fileUrl || '#'} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-600 transition-colors">
          <Download size={18} />
        </a>
      ) : <span className="text-surface-300">-</span>
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Generate and download platform reports"
        breadcrumbs={['Home', 'Reports']}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={RefreshCw} onClick={fetchTasks} loading={loading}>Refresh</Button>
            <Button variant="gradient" icon={Plus} onClick={() => setShowGenerate(true)}>Generate Report</Button>
          </div>
        }
      />

      <Card className="p-5">
        <DataTable
          data={tasks}
          columns={columns}
          searchable
          emptyTitle="No reports generated"
          emptyDescription="Click 'Generate Report' to queue a new background report."
          emptyIcon={BarChart2}
        />
      </Card>

      {/* Generate Modal */}
      {showGenerate && (
        <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} size="sm">
          <ModalHeader title="Generate Report" onClose={() => setShowGenerate(false)} />
          <ModalBody className="space-y-4">
            <FormField label="Report Type" required>
              <Select value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="ATTENDANCE_MONTHLY">Monthly Attendance</option>
                <option value="FEES_DUE">Pending Fees</option>
                <option value="STUDENT_PERFORMANCE">Student Performance</option>
              </Select>
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button variant="gradient" icon={FileText} loading={generating} onClick={handleGenerate}>Queue Generation</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
