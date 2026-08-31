"use client";

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle, RefreshCw, Loader2, Layers, BookOpen, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { studentAPI } from '@/api/student.js';

export default function StudentTransactionsPage() {
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
        res = await studentAPI.getTransactions();
      } catch (err) {
        res = await fetch('/api/v1/fees-payments/my-dues').then(r => r.json()).then(d => ({ data: d }));
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
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = transactions
    .filter((t) => t.status === 'SUCCESS' || t.status === 'PAID')
    .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            My Transactions & Receipts
          </h1>
          <p className="text-sm font-medium text-surface-500 mt-1">
            Track your course enrollment receipts, enrolled batch details, and payment history.
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 text-surface-700 dark:text-surface-200 rounded-xl font-semibold text-sm shadow-sm transition-all"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Transactions</span>
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-surface-900 dark:text-white mt-2">{transactions.length}</p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Amount Paid</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">₹{totalSpent.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center gap-2">
          <CreditCard className="text-accent-600" size={20} />
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Transaction History</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-surface-400">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-base">No payment transactions found</p>
              <p className="text-xs text-surface-400 mt-1">Enrolled courses and payment receipts will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-50/80 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
                  <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-widest">Enrolled Batch & Course</th>
                  <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-widest">Price / Amount Paid</th>
                  <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-widest">Transaction ID & Method</th>
                  <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {transactions.map((txn, idx) => (
                  <tr key={txn._id || idx} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/40 transition-colors">
                    {/* Enrolled Batch & Course */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 self-start">
                          <Layers size={14} />
                          <span>{txn.batchName}</span>
                        </div>
                        <div className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1">
                          <BookOpen size={13} className="text-surface-400" />
                          <span>{txn.courseName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price / Amount */}
                    <td className="px-6 py-4">
                      <div className="font-black text-surface-900 dark:text-white text-base">
                        ₹{Number(txn.amountPaid || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Transaction ID & Method */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-surface-800 dark:text-surface-200">
                        {txn.transactionId}
                      </div>
                      <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mt-0.5">
                        Payment via {txn.paymentMethod || 'ONLINE'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] font-medium text-surface-400">
                        {new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {txn.status === 'SUCCESS' || txn.status === 'PAID' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">SUCCESS</span>
                        </div>
                      ) : txn.status === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50">
                          <XCircle size={14} className="text-red-600 dark:text-red-400" />
                          <span className="text-[10px] font-black text-red-700 dark:text-red-300 uppercase tracking-wider">FAILED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
                          <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">PENDING</span>
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
