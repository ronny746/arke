"use client";

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle, RefreshCw, Loader2, Layers, BookOpen, Users, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parentAPI } from '@/api/parent.js';

export default function ParentTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await parentAPI.getTransactions();
      } catch (err) {
        res = await parentAPI.getFees();
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
      toast.error('Failed to load child transaction history');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = transactions
    .filter((t) => t.status === 'SUCCESS' || t.status === 'PAID')
    .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

  const totalWards = new Set(transactions.map((t) => t.studentId?._id).filter(Boolean)).size;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Child Transactions & Receipts
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            View course enrollment receipts, enrolled batch details, and fee payment history for your children.
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Linked Children</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalWards} {totalWards === 1 ? 'Child' : 'Children'}</p>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount Paid</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">₹{totalSpent.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-900">Payment Transactions</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-base">No payment transactions found</p>
              <p className="text-xs text-gray-400 mt-1">Course purchase receipts for your linked children will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Child Name</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Enrolled Batch & Course</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Price / Amount Paid</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((txn, idx) => (
                  <tr key={txn._id || idx} className="hover:bg-gray-50/50 transition-colors">
                    {/* Child Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {txn.studentId?.firstName?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {txn.studentId?.firstName ? `${txn.studentId.firstName} ${txn.studentId.lastName || ''}` : 'Child'}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {txn.studentId?.email || txn.studentId?.phone || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Enrolled Batch & Course */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 self-start">
                          <Layers size={14} />
                          <span>{txn.batchName}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <BookOpen size={13} className="text-gray-400" />
                          <span>{txn.courseName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price / Amount */}
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-base">
                        ₹{Number(txn.amountPaid || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Transaction ID & Method */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-gray-800">
                        {txn.transactionId}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        Via {txn.paymentMethod || 'ONLINE'}
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
