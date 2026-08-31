import { useState, useEffect } from 'react';
import { Filter, Download, ClipboardList } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { cn } from '../../../utils/helpers.js';
import { superAdminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

const actionColors = {
  LOGIN: 'badge-success',
  LOGOUT: 'badge-surface',
  CREATE: 'badge-primary',
  UPDATE: 'badge-warning',
  DELETE: 'badge-danger',
  ERROR: 'badge-danger',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await superAdminAPI.getAuditLogs();
        setLogs(res.data?.data?.logs || res.data?.logs || res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const columns = [
    { header: 'Action', accessorKey: 'action', cell: (r) => <span className={cn('badge text-xs', actionColors[r.action] || 'badge-surface')}>{r.action || r.actionType || 'LOG'}</span> },
    { header: 'User', accessorKey: 'user', cell: (r) => <span className="font-medium text-sm text-surface-800 dark:text-white">{r.user?.name || r.user?.email || r.userId || 'System'}</span> },
    { header: 'Resource', accessorKey: 'resource', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400 max-w-xs truncate block">{r.resource || r.module || '-'}</span> },
    { header: 'IP Address', accessorKey: 'ip', cell: (r) => <code className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">{r.ipAddress || r.ip || '-'}</code> },
    { header: 'Timestamp', accessorKey: 'timestamp', cell: (r) => <span className="text-xs text-surface-400">{new Date(r.timestamp || r.createdAt).toLocaleString('en-IN')}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        subtitle="Track all platform activity and changes"
        breadcrumbs={['Home', 'Audit Logs']}
        actions={
          <Button variant="outline" size="sm" icon={Download} onClick={() => {}}>Export Logs</Button>
        }
      />

      <Card className="p-5">
        <DataTable
          data={logs}
          columns={columns}
          searchable
          searchPlaceholder="Search logs..."
          pageSize={15}
          emptyTitle="No logs found"
          emptyDescription="No activity found."
          emptyIcon={ClipboardList}
        />
      </Card>
    </div>
  );
}
