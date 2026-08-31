"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Avatar } from '@/components/ui/index.jsx';
import { Users, LineChart, ArrowRight, Phone, BookOpen, FileCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.data?.childrenIds) {
          setChildrenList(result.data.childrenIds);
        }
      } catch (err) {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title={`Welcome, ${user?.firstName || 'Parent'}!`}
        subtitle="Overview of your children's academic progress"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Card */}
        <Card className="p-6 hover:shadow-xl transition-all duration-300 flex flex-col justify-between bg-white border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-5">
              <LineChart size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Performance & Exams</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Track your children's exam scores, mock tests, and view detailed analytical reports.</p>
          </div>
          <Link href="/parent/exams" className="relative z-10 mt-6 flex items-center text-purple-600 font-bold hover:text-purple-700 transition-colors">
            View Analytics <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Linked Students</h2>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium">{childrenList.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : childrenList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 border-dashed border-2">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Students Linked</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              You haven't been linked to any student yet. Please contact the school administration to map your children to this account.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {childrenList.map((child: any, idx: number) => (
              <Card key={child._id || idx} className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white group">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Avatar src={child.profilePictureUrl} fallback={child.firstName?.charAt(0) || '?'} size="lg" className="border shadow-sm bg-blue-50 text-blue-600 relative z-10" />
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{child.firstName} {child.lastName}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                      <Phone size={14} className="text-gray-400" />
                      {child.phone || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-3 bg-gray-50/30">
                  <div className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-500 flex items-center gap-2 font-medium">
                      <BookOpen size={16} className="text-blue-500" /> Class
                    </span>
                    <span className="font-bold text-gray-800">
                      {child.metadata?.class || 'N/A'} {child.metadata?.section ? `- ${child.metadata.section}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-500 flex items-center gap-2 font-medium">
                      <FileCheck size={16} className="text-indigo-500" /> Roll No
                    </span>
                    <span className="font-bold text-gray-800">
                      {child.metadata?.rollNo || 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
