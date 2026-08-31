import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../api/index.js';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { FileCheck, Plus, Edit, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuestionBanks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuestionBanks();
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load question banks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Question Bank?')) return;
    try {
      await adminAPI.deleteQuestionBank(id);
      toast.success('Question Bank deleted successfully');
      fetchQuestionBanks();
    } catch (error) {
      toast.error('Failed to delete question bank');
    }
  };

  const columns = [
    { header: 'Title', accessorKey: 'title' },
    { header: 'Total Questions', accessorKey: 'totalQuestions' },
    { header: 'Total Marks', accessorKey: 'totalMarks' },
    {
      header: '',
      cell: (row) => (
        <RowActions
          actions={[
            {
              icon: Edit,
              label: 'View / Edit',
              onClick: () => navigate(`/admin/question-banks/${row._id}/edit`)
            },
            {
              icon: Trash2,
              label: 'Delete',
              danger: true,
              onClick: () => handleDelete(row._id)
            }
          ]}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Banks"
        description="Manage your imported question papers"
        actions={
          <div className="flex gap-2">
            <a href="/sample-template.docx" download>
              <Button variant="secondary" icon={Download}>Sample Format</Button>
            </a>
            <Button icon={Plus} onClick={() => navigate('/admin/question-banks/create')}>
              Upload Paper
            </Button>
          </div>
        }
      />

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          searchable
          emptyTitle="No Question Banks found"
          emptyDescription="Upload a Word document to create your first Question Bank."
          emptyIcon={FileCheck}
        />
      </Card>
    </div>
  );
}
