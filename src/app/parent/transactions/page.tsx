"use client";

import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Layers,
  BookOpen,
  Users,
  User,
  BellRing,
  ArrowRight,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { parentAPI } from '@/api/parent.js';

export default function ParentTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txnRes, feesRes] = await Promise.allSettled([
        parentAPI.getTransactions(),
        parentAPI.getFees()
      ]);

      if (txnRes.status === 'fulfilled' && txnRes.value?.data?.success) {
        const rawData = txnRes.value.data.data || [];
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
          status: item.status === 'PAID' ? 'SUCCESS' : (item.status || 'SUCCESS'),
          installmentNumber: item.installmentNumber
        }));
        setTransactions(normalized);
      }

      if (feesRes.status === 'fulfilled' && feesRes.value?.data?.success) {
        setDues(feesRes.value.data.data || []);
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

  // Find urgent upcoming installment for any child
  const urgentInstallment = dues.flatMap(d => (d.installments || []).map((i: any) => ({
    ...i,
    course: d.courseId,
    student: d.studentId,
    planId: d._id
  })))
    .filter(i => i.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const isUrgentOverdue = urgentInstallment?.dueDate && new Date(urgentInstallment.dueDate) < new Date();

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Child Transactions & Fee Schedules
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Track fee receipts, installments, and payment due dates for your children.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm shadow-sm transition-all"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Urgent Payment Due Alert Banner */}
      {urgentInstallment && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
          isUrgentOverdue
            ? 'bg-rose-50/90 border-rose-200'
            : 'bg-amber-50/90 border-amber-200'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              isUrgentOverdue ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              <BellRing size={20} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isUrgentOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isUrgentOverdue ? 'Payment Overdue' : 'Payment Reminder'}
                </span>
                <span className="text-xs font-bold text-gray-700">
                  {urgentInstallment.student?.firstName ? `${urgentInstallment.student.firstName}'s ` : ''}Installment #{urgentInstallment.installmentNumber} for {urgentInstallment.course?.name || 'Course'}
                </span>
              </div>
              <h3 className="text-base font-black text-gray-900 mt-1">
                Amount Due: ₹{Number(urgentInstallment.amount || 0).toLocaleString()}
                <span className="text-xs font-medium text-gray-500 ml-2">
                  (Due by: {new Date(urgentInstallment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Ensure timely payment to maintain your child's uninterrupted access to lectures, DPPs, and batch sessions.
              </p>
            </div>
          </div>

          <Link
            href={`/checkout/${urgentInstallment.course?._id || urgentInstallment.course}`}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Pay Installment Online</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transactions</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{transactions.length}</p>
          <span className="text-xs text-gray-500">Confirmed receipts for {totalWards} child(ren)</span>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Tuition Paid</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">₹{totalSpent.toLocaleString()}</p>
          <span className="text-xs text-emerald-600 font-semibold">Verified online & offline receipts</span>
        </div>
      </div>

      {/* Active Installment Schedules */}
      {dues.some(d => d.installments?.length > 0) && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="text-blue-600" size={18} />
              <h2 className="text-base font-black text-gray-900">Child Installment Plans & Due Dates</h2>
            </div>
            <span className="text-xs font-bold text-gray-500">Official Installment Schedules</span>
          </div>

          <div className="space-y-4">
            {dues.filter(d => d.installments?.length > 0).map(plan => (
              <div key={plan._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {plan.studentId?.firstName ? `${plan.studentId.firstName} ${plan.studentId.lastName || ''}` : 'Child'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm mt-0.5">
                      {plan.courseId?.name || 'Course Plan'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Total Agreed Fee: <strong>₹{(plan.totalCoursePrice || (plan.amountPaid + plan.amountDue)).toLocaleString()}</strong> | Paid: <strong className="text-emerald-600">₹{(plan.amountPaid || 0).toLocaleString()}</strong> | Balance: <strong className="text-amber-600">₹{(plan.amountDue || 0).toLocaleString()}</strong>
                    </p>
                  </div>

                  <Link
                    href={`/checkout/${plan.courseId?._id || plan.courseId}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    Pay Next Installment
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {(plan.installments || []).map((inst: any) => {
                    const isPaid = inst.status === 'PAID';
                    const isOverdue = !isPaid && inst.dueDate && new Date(inst.dueDate) < new Date();

                    return (
                      <div
                        key={inst.installmentNumber}
                        className={`p-3 rounded-xl border text-xs font-medium ${
                          isPaid
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : isOverdue
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>Inst #{inst.installmentNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            isPaid ? 'bg-emerald-200 text-emerald-900' : isOverdue ? 'bg-rose-200 text-rose-900' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                          </span>
                        </div>
                        <div className="text-sm font-black mt-1">₹{Number(inst.amount || 0).toLocaleString()}</div>
                        <div className="text-[11px] opacity-75 mt-0.5">
                          {isPaid ? `Paid: ${new Date(inst.paidAt || inst.dueDate).toLocaleDateString()}` : `Due: ${new Date(inst.dueDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="text-purple-600" size={20} />
          <h2 className="text-lg font-bold text-gray-900">Receipts & Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-base">No payment transactions found</p>
              <p className="text-xs text-gray-400 mt-1">Fee receipts for your children will be archived here.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Child</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Enrolled Program</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount Paid</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Transaction Info</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {transactions.map((txn, idx) => (
                  <tr key={txn._id || idx} className="hover:bg-gray-50/50 transition-colors">
                    {/* Child */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                          {txn.studentId?.firstName?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {txn.studentId?.firstName ? `${txn.studentId.firstName} ${txn.studentId.lastName || ''}` : 'Child'}
                          </div>
                          {txn.studentId?.metadata?.rollNo && (
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                              Roll #{txn.studentId.metadata.rollNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Enrolled Batch & Course */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{txn.courseName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{txn.batchName}</div>
                    </td>

                    {/* Price / Amount Paid */}
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-base">
                        ₹{Number(txn.amountPaid || 0).toLocaleString()}
                      </div>
                      {txn.installmentNumber && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Installment #{txn.installmentNumber}
                        </span>
                      )}
                    </td>

                    {/* Transaction ID & Method */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-gray-800">
                        {txn.transactionId}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        {txn.paymentMethod || 'ONLINE'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={13} />
                        {txn.status || 'SUCCESS'}
                      </span>
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
