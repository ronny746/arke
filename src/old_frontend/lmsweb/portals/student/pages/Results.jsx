import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Award } from 'lucide-react';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function Results() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await studentAPI.getResults();
        setData(res.data?.data || []);
      } catch (err) {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const columns = [
    { 
      header: 'Exam/Test', 
      accessorKey: 'examId.title',
      cell: (r) => r.examId?.title || 'Unknown Exam'
    },
    { 
      header: 'Subject', 
      cell: (r) => r.subjectId?.name || 'N/A' 
    },
    { 
      header: 'Marks Obtained', 
      accessorKey: 'marksObtained' 
    },
    { 
      header: 'Total Marks', 
      accessorKey: 'totalMarks' 
    },
    { 
      header: 'Grade', 
      accessorKey: 'grade' 
    },
    { 
      header: 'Remarks', 
      accessorKey: 'remarks' 
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="My Results" 
        subtitle="View your academic performance" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search exams..."
          emptyIcon={Award}
          emptyTitle="No results published yet"
        />
      </Card>
    </div>
  );
}
