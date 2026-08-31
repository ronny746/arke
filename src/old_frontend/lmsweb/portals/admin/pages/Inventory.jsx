import { useState, useEffect } from 'react';
import { Package, Plus, Archive } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getInventory();
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const columns = [
    { header: 'Item Name', accessorKey: 'name' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Quantity', accessorKey: 'quantity' },
    { header: 'Status', accessorKey: 'status' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Management"
        subtitle="Manage institute assets, books, and equipment"
        breadcrumbs={['Home', 'Inventory']}
        actions={<Button variant="gradient" icon={Plus}>Add Item</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Items" value="0" icon={Package} color="primary" />
        <StatCard title="Low Stock" value="0" icon={Archive} color="warning" />
        <StatCard title="Categories" value="0" icon={Package} color="secondary" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No inventory items found"
          emptyDescription="Add your first item to manage inventory."
          emptyIcon={Package}
        />
      </Card>
    </div>
  );
}
