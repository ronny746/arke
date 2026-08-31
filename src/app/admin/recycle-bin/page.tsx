"use client";

import { useState, useEffect } from 'react';
import { Archive, RefreshCcw, Database } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function RecycleBinPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getRecycleBinItems();
      const collections = res.data?.data || [];
      setData(collections);
      if (collections.length > 0 && !activeTab) {
        setActiveTab(collections[0].collectionName);
      } else if (collections.length === 0) {
        setActiveTab(null);
      }
    } catch (error) {
      toast.error('Failed to load recycle bin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const handleRestore = async (modelName, id) => {
    if (!window.confirm("Are you sure you want to restore this item? It will be moved back to its original location.")) return;
    try {
      await adminAPI.restoreRecycleBinItem({ modelName, id });
      toast.success("Item restored successfully");
      fetchDeletedItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore item");
    }
  };

  const columns = [
    { header: 'Display Name', cell: (row) => row.displayName || 'Unknown Item' },
    { header: 'Deleted At', cell: (row) => new Date(row.deletedAt).toLocaleString() },
    { header: 'ID', accessorKey: '_id' },
    {
      header: 'Actions',
      cell: (row, collectionName) => (
        <RowActions actions={[
          { 
            label: 'Restore', 
            icon: RefreshCcw, 
            onClick: () => handleRestore(collectionName, row._id) 
          }
        ]} />
      )
    }
  ];

  // We need to pass the collectionName down to the cell renderer in our custom way,
  // or we can map the data before passing it to DataTable so it includes collectionName.
  const activeCollectionData = data.find(c => c.collectionName === activeTab);
  const tableData = activeCollectionData 
    ? activeCollectionData.items.map(item => ({ ...item, _collectionName: activeTab }))
    : [];

  const tableColumns = [
    ...columns.slice(0, 3),
    {
      header: 'Actions',
      cell: (row) => (
        <RowActions actions={[
          { 
            label: 'Restore', 
            icon: RefreshCcw, 
            onClick: () => handleRestore(row._collectionName, row._id) 
          }
        ]} />
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Recycle Bin"
        subtitle="View and restore deleted items"
        breadcrumbs={['Home', 'Recycle Bin']}
      />

      <Card className="p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading deleted items...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Recycle Bin is Empty</h3>
            <p className="text-gray-500">No items have been deleted yet.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-48 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto">
              {data.map(collection => (
                <button
                  key={collection.collectionName}
                  onClick={() => setActiveTab(collection.collectionName)}
                  className={`px-4 py-3 text-left rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === collection.collectionName 
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{collection.collectionName.replace('Model', '')}</span>
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {collection.items.length}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Table Area */}
            <div className="flex-1 min-w-0 border-l border-gray-100 md:pl-6">
              <DataTable
                data={tableData}
                columns={tableColumns}
                searchable
                emptyTitle="No items in this category"
                emptyIcon={Database}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
