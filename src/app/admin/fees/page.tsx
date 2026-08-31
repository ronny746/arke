"use client";

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle, Search, RefreshCw, Loader2, Layers, BookOpen, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '@/api/admin.js';

export default function AdminFeesPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await adminAPI.getTransactions();
      } catch (err: any) {
        console.warn("getTransactions API call failed, falling back to getFeeRecords", err);
        res = await adminAPI.getFeeRecords();
      }

      if (res?.data?.success) {
        const rawData = res.data.data || [];
        const normalized = rawData.map((item: any) => ({
          _id: item._id,
          studentId: item.studentId,
          courseId: item.courseId,
          batchId: item.batchId,
          courseName: item.courseName || item.courseId?.name || 'General Course',
          batchName: item.batchName || (item.batchId ? `${item.batchId.name}${item.batchId.section ? ' (Sec ' + item.batchId.section + ')' : ''}` : 'Enrolled Batch'),
          amountPaid: item.amountPaid ?? item.amountDue ?? 0,
          transactionId: item.transactionId || `REC_${item._id?.slice(-8).toUpperCase()}`,
          paymentMethod: item.paymentMethod || 'ONLINE',
          createdAt: item.createdAt || item.dueDate,
          status: item.status === 'PAID' ? 'SUCCESS' : (item.status || 'SUCCESS')
        }));
        setTransactions(normalized);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transaction records');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    const query = searchQuery.trim().toLowerCase();

    const studentName = `${txn.studentId?.firstName || ''} ${txn.studentId?.lastName || ''} ${txn.studentName || ''}`.toLowerCase();
    const email = (txn.studentId?.email || '').toLowerCase();
    const phone = (txn.studentId?.phone || txn.phone || '').toLowerCase();
    const batch = `${txn.batchName || ''} ${txn.batchId?.name || ''} ${txn.batchId?.section || ''}`.toLowerCase();
    const course = `${txn.courseName || ''} ${txn.courseId?.name || ''}`.toLowerCase();
    const txnId = (txn.transactionId || txn._id || '').toLowerCase();
    const method = (txn.paymentMethod || '').toLowerCase();
    const amount = String(txn.amountPaid || txn.amount || '').toLowerCase();
    const rollNo = String(txn.studentId?.metadata?.rollNo || txn.rollNo || '').toLowerCase();

    const matchesSearch =
      !query ||
      studentName.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      batch.includes(query) ||
      course.includes(query) ||
      txnId.includes(query) ||
      method.includes(query) ||
      amount.includes(query) ||
      rollNo.includes(query);

    const matchesStatus =
      statusFilter === 'ALL' ||
      txn.status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = transactions
    .filter((t) => t.status === 'SUCCESS' || t.status === 'PAID')
    .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Student Transactions & Fees</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            View all student payment transactions, enrolled batches, and prices across the institute.
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm shadow-sm transition-all"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transactions</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{transactions.length}</p>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Successful Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">₹{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Enrolments</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {new Set(transactions.map(t => t.studentId?._id).filter(Boolean)).size} Students
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden space-y-4">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search student, batch, course, TXN ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-base">No transaction records found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting search or status filters.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Enrolled Batch & Course</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Price / Amount</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Transaction Info</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((txn, idx) => (
                  <tr key={txn._id || idx} className="hover:bg-gray-50/50 transition-colors">
                    {/* Student */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                          {txn.studentId?.firstName?.[0] || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {txn.studentId?.firstName ? `${txn.studentId.firstName} ${txn.studentId.lastName || ''}` : 'Student'}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {txn.studentId?.email || txn.studentId?.phone || 'N/A'}
                          </div>
                          {txn.studentId?.metadata?.rollNo && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {txn.studentId.metadata.rollNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Batch Enrolled & Course */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Layers size={13} />
                          <span>{txn.batchName}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                          <BookOpen size={12} className="text-gray-400" />
                          <span>{txn.courseName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price / Amount Paid */}
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-base">
                        ₹{Number(txn.amountPaid || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Transaction Details */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-gray-800">
                        {txn.transactionId}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        Method: {txn.paymentMethod || 'ONLINE'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-gray-700">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] font-medium text-gray-400">
                        {new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {txn.status === 'SUCCESS' || txn.status === 'PAID' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">SUCCESS</span>
                        </div>
                      ) : txn.status === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200">
                          <XCircle size={14} className="text-red-600" />
                          <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">FAILED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                          <Clock size={14} className="text-amber-600" />
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">PENDING</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
