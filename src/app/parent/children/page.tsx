"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Avatar } from '@/components/ui/index.jsx';
import { Users, AlertCircle, Phone, BookOpen, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyChildrenPage() {
  const [childrenList, setChildrenList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await res.json();
        if (result.success && result.data && result.data.childrenIds) {
          setChildrenList(result.data.childrenIds);
        }
      } catch (err) {
        toast.error("Failed to load children profiles");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0033a0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="My Children"
        subtitle="Manage and view your linked children profiles"
        icon={<Users size={24} className="text-[#0033a0]" />}
      />

      {childrenList.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 border-dashed border-2">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Children Linked</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            We couldn't find any student profiles linked to your mobile number. Please contact the school administration to link your child to this account.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {childrenList.map((child: any) => (
            <Card key={child._id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="p-6 bg-gradient-to-br from-[#0033a0]/5 to-transparent border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <Avatar src={child.profilePictureUrl} fallback={child.firstName?.charAt(0)} size="lg" className="border-4 border-white shadow-sm" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{child.firstName} {child.lastName}</h3>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 mt-0.5">
                      <Phone size={14} />
                      {child.phone || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white space-y-4">
                {child.metadata?.class && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-2"><BookOpen size={16} className="text-gray-400" /> Class/Batch</span>
                    <span className="font-bold text-gray-800">{child.metadata.class} {child.metadata.section ? `- ${child.metadata.section}` : ''}</span>
                  </div>
                )}
                {child.metadata?.rollNo && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-2"><FileCheck size={16} className="text-gray-400" /> Roll No</span>
                    <span className="font-bold text-gray-800">{child.metadata.rollNo}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
