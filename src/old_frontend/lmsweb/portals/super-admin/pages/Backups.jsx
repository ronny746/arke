import { useState, useEffect } from 'react';
import { Database, Download, Trash2, Calendar, HardDrive, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { superAdminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.getBackups();
      setBackups(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleRequestBackup = async () => {
    setRequesting(true);
    try {
      await superAdminAPI.requestBackup({ type: 'manual' });
      toast.success('Backup process started! It will appear here shortly.');
      fetchBackups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request backup');
    } finally {
      setRequesting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      await superAdminAPI.deleteBackup(id);
      toast.success('Backup deleted successfully');
      setBackups(prev => prev.filter(b => b._id !== id && b.id !== id));
    } catch (err) {
      toast.error('Failed to delete backup');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Database Backups" 
          subtitle="Manage and download your automated and manual system backups"
          breadcrumbs={['Home', 'System', 'Backups']} 
        />
        <Button onClick={handleRequestBackup} disabled={requesting} className="gap-2 shrink-0">
          <Database className="w-4 h-4" />
          {requesting ? 'Processing...' : 'Create Backup'}
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-sm text-surface-500 dark:text-surface-400">
                <th className="p-4 font-medium">Backup Name</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Size</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-surface-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading backups...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-surface-500">
                    No backups found. Create one to get started.
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup._id || backup.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">
                            {backup.fileName || `backup_${format(new Date(backup.createdAt), 'yyyyMMdd_HHmm')}`}
                          </p>
                          <p className="text-xs text-surface-500">Database Dump (.zip)</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        backup.type === 'automated' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {backup.type || 'manual'}
                      </span>
                    </td>
                    <td className="p-4 text-surface-600 dark:text-surface-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-surface-400" />
                        {format(new Date(backup.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="p-4 text-surface-600 dark:text-surface-300">
                      {backup.size ? `${(backup.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        backup.status === 'completed' ? 'bg-success/10 text-success' :
                        backup.status === 'failed' ? 'bg-danger/10 text-danger' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {backup.status || 'completed'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.open(backup.fileUrl, '_blank')}
                          disabled={backup.status !== 'completed' || !backup.fileUrl}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-danger hover:bg-danger/10"
                          onClick={() => handleDelete(backup._id || backup.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
